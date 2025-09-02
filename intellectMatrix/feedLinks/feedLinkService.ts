import EventEmitter from "events"
import { FeedFetcher, FeedItem } from "./feedFetcher"

export interface FeedLinkOptions {
  /** Pull interval in milliseconds (default: 60_000) */
  intervalMs?: number
  /** Retry attempts per pull on failure (default: 2) */
  retries?: number
  /** Linear backoff base in ms: wait = attempt * backoffBaseMs (default: 300) */
  backoffBaseMs?: number
  /** Max items to keep in memory for listRecent & de-dup (default: 2000) */
  maxItems?: number
  /** Start pulling immediately on start() (default: true) */
  startImmediate?: boolean
}

/** Typed event signatures */
interface FeedLinkEvents {
  /** Emitted for each new (unseen) item in reverse-chronological order */
  link: (item: FeedItem) => void
  /** Emitted when a pull fails after retries */
  error: (err: Error) => void
}

type EventKey = keyof FeedLinkEvents

export class FeedLinkService extends EventEmitter {
  private interval?: NodeJS.Timeout
  private readonly intervalMs: number
  private readonly retries: number
  private readonly backoffBaseMs: number
  private readonly maxItems: number
  private readonly startImmediate: boolean

  private pulling = false
  private running = false

  /** De-duplication + storage */
  private seen = new Set<string>()
  private store: FeedItem[] = [] // newest first
  private index = new Map<string, FeedItem>()

  constructor(private fetcher: FeedFetcher, opts: FeedLinkOptions = {}) {
    super()
    this.intervalMs = Math.max(250, opts.intervalMs ?? 60_000)
    this.retries = Math.max(0, opts.retries ?? 2)
    this.backoffBaseMs = Math.max(0, opts.backoffBaseMs ?? 300)
    this.maxItems = Math.max(1, opts.maxItems ?? 2000)
    this.startImmediate = opts.startImmediate ?? true
  }

  /** Begin periodic pulling */
  start(): void {
    if (this.running) return
    this.running = true

    // schedule periodic pulls
    this.interval = setInterval(() => void this.pull(), this.intervalMs)
    // optional immediate pull
    if (this.startImmediate) {
      void this.pull()
    }
  }

  /** Stop periodic pulling */
  stop(): void {
    this.running = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }
  }

  /** Change interval on the fly */
  updateInterval(ms: number): void {
    const next = Math.max(250, Math.floor(ms))
    if (next === this.intervalMs) return
    // @ts-expect-error: readonly field pattern; re-create with new service if you want strict immutability
    this.intervalMs = next
    if (this.running) {
      if (this.interval) clearInterval(this.interval)
      this.interval = setInterval(() => void this.pull(), this.intervalMs)
    }
  }

  /** Get a snapshot of stats */
  getStats() {
    return {
      seenCount: this.seen.size,
      storedCount: this.store.length,
      intervalMs: this.intervalMs,
      retries: this.retries,
      backoffBaseMs: this.backoffBaseMs,
      running: this.running
    }
  }

  /** Return the most recent items (newest first) */
  listRecent(limit: number = 20): FeedItem[] {
    const n = Math.max(0, Math.min(Math.floor(limit), this.store.length))
    // slice is already newest-first
    return this.store.slice(0, n).map(cloneItem)
  }

  /** Core: pull with retries, de-dup, and emit events for new items */
  private async pull(): Promise<void> {
    if (!this.running) return
    if (this.pulling) return // skip overlapping pulls
    this.pulling = true

    try {
      const items = await this.fetchWithRetries()
      if (!Array.isArray(items) || items.length === 0) return

      // sanitize and sort newest-first by publishedAt
      const valid = items
        .filter(isValidItem)
        .sort((a, b) => b.publishedAt - a.publishedAt)

      // Iterate newest-first; emit for truly new IDs
      for (const item of valid) {
        if (this.seen.has(item.id)) continue
        this.ingest(item)
        this.emit("link", cloneItem(item))
      }

      // Also ingest any older (already seen) but possibly updated entries into index
      // (optional; if updates matter, uncomment)
      // for (const item of valid) {
      //   if (!this.seen.has(item.id)) continue
      //   this.index.set(item.id, item)
      // }
    } catch (err) {
      this.emit("error", err as Error)
    } finally {
      this.pulling = false
    }
  }

  /** Insert item into store/index, enforce caps deterministically */
  private ingest(item: FeedItem): void {
    this.seen.add(item.id)
    this.index.set(item.id, item)

    // insert in correct position (store is newest-first)
    const pos = binarySearchNewestFirst(this.store, item.publishedAt)
    this.store.splice(pos, 0, item)

    // enforce capacity
    if (this.store.length > this.maxItems) {
      const removed = this.store.splice(this.maxItems)
      for (const it of removed) {
        // only drop from de-dup/index if no longer present in store
        if (!this.store.some(s => s.id === it.id)) {
          this.index.delete(it.id)
          this.seen.delete(it.id)
        }
      }
    }
  }

  /** Retry wrapper with linear backoff */
  private async fetchWithRetries(): Promise<FeedItem[]> {
    let attempt = 0
    let lastErr: unknown
    while (attempt <= this.retries) {
      attempt++
      try {
        const res = await this.fetcher.fetchAll()
        return Array.isArray(res) ? res : []
      } catch (e) {
        lastErr = e
        if (attempt > this.retries) break
        await sleep(this.backoffBaseMs * attempt)
      }
    }
    throw (lastErr instanceof Error ? lastErr : new Error(String(lastErr)))
  }

  // ---- Typed EventEmitter overrides ----
  public override on<T extends EventKey>(event: T, listener: FeedLinkEvents[T]): this {
    return super.on(event, listener as any)
  }
  public override off<T extends EventKey>(event: T, listener: FeedLinkEvents[T]): this {
    return super.off(event, listener as any)
  }
  public override once<T extends EventKey>(event: T, listener: FeedLinkEvents[T]): this {
    return super.once(event, listener as any)
  }
}

/** Utilities */

function isValidItem(i: any): i is FeedItem {
  return (
    i &&
    typeof i.id === "string" &&
    typeof i.title === "string" &&
    typeof i.url === "string" &&
    Number.isFinite(i.publishedAt)
  )
}

function cloneItem(i: FeedItem): FeedItem {
  return { id: i.id, title: i.title, url: i.url, publishedAt: i.publishedAt }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Find insertion index for a timestamp into an array sorted newest-first.
 * Returns the position where an item with `ts` should be inserted.
 */
function binarySearchNewestFirst(arr: FeedItem[], ts: number): number {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (arr[mid].publishedAt > ts) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return lo
}
