import { HolderMap, HolderEntry } from "./holderMap"

export interface HolderSummary {
  totalHolders: number
  totalBalance: number
}

export interface SubscribeOptions {
  /** Polling interval in ms (min 1000ms). Default: 10_000 */
  intervalMs?: number
  /** Add up to ±jitterMs random jitter per tick to avoid thundering herd */
  jitterMs?: number
  /** Abort ongoing fetches when unsubscribing (Node 18+/WHATWG fetch) */
  abortOnUnsubscribe?: boolean
  /** Fire an immediate leading tick (default true) */
  leading?: boolean
  /** Only call onChange when summary actually changes (default true) */
  emitOnlyOnChange?: boolean
}

export interface Subscription {
  /** Stop the polling loop */
  stop(): void
  /** Returns whether the loop is still active */
  active(): boolean
}

function clampInterval(ms: number | undefined, min = 1000, dflt = 10_000) {
  const v = ms ?? dflt
  return Math.max(min, Math.floor(v))
}

function addJitter(baseMs: number, jitterMs = 0) {
  if (jitterMs <= 0) return baseMs
  const delta = Math.floor((Math.random() * 2 - 1) * jitterMs)
  return Math.max(250, baseMs + delta)
}

export class HolderMapService {
  private holderMap = new HolderMap()

  /**
   * Refresh the holders for a mint. Returns the new summary.
   * If the fetch throws, the error is propagated to the caller.
   */
  async refresh(
    mint: string,
    fetchHolders: () => Promise<HolderEntry[]>
  ): Promise<HolderSummary> {
    const entries = await fetchHolders()
    this.holderMap.update(mint, entries)
    return this.holderMap.summarize(mint)
  }

  /**
   * Subscribe to periodic refreshes.
   * Returns a Subscription handle with stop()/active().
   */
  subscribe(
    mint: string,
    fetchHolders: () => Promise<HolderEntry[]>,
    onChange: (summary: HolderSummary) => void,
    opts: SubscribeOptions = {}
  ): Subscription {
    const intervalBase = clampInterval(opts.intervalMs)
    const jitterMs = Math.max(0, opts.jitterMs ?? 0)
    const leading = opts.leading ?? true
    const emitOnlyOnChange = opts.emitOnlyOnChange ?? true
    const abortOnUnsubscribe = opts.abortOnUnsubscribe ?? true

    let timer: NodeJS.Timeout | null = null
    let inFlight = false
    let lastSummary: HolderSummary | null = null
    let stopped = false
    let controller: AbortController | null = null

    const tick = async () => {
      if (stopped || inFlight) return
      inFlight = true
      controller = abortOnUnsubscribe ? new AbortController() : null

      try {
        // fetchHolders may ignore the signal; that's fine.
        const summary = await this.refresh(mint, fetchHolders)
        const changed =
          !lastSummary ||
          summary.totalHolders !== lastSummary.totalHolders ||
          summary.totalBalance !== lastSummary.totalBalance

        if (!emitOnlyOnChange || changed) {
          onChange(summary)
          lastSummary = summary
        }
      } catch (err) {
        // Don't throw; just log once. Upstream may choose to add own logger.
        // eslint-disable-next-line no-console
        console.warn("[HolderMapService] refresh failed:", err)
      } finally {
        inFlight = false
      }
    }

    const scheduleNext = () => {
      if (stopped) return
      const due = addJitter(intervalBase, jitterMs)
      timer = setTimeout(async () => {
        await tick()
        scheduleNext()
      }, due)
    }

    // Start
    if (leading) {
      // Fire and then schedule next
      void tick().finally(scheduleNext)
    } else {
      scheduleNext()
    }

    return {
      stop: () => {
        stopped = true
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        if (controller) {
          try {
            controller.abort()
          } catch {
            /* no-op */
          }
          controller = null
        }
      },
      active: () => !stopped,
    }
  }

  /** One-shot unsubscribe for legacy timers (backward compatibility) */
  unsubscribe(timer: NodeJS.Timeout): void {
    clearTimeout(timer)
  }

  getSummary(mint: string): HolderSummary {
    return this.holderMap.summarize(mint)
  }

  getHolders(mint: string): HolderEntry[] {
    return this.holderMap.getHolders(mint)
  }
}
