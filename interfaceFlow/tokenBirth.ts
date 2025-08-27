/**
 * Represents a mint event with timestamp.
 */
export interface MintEvent {
  mint: string
  timestamp: number
}

/** Minimal logger interface (can be console) */
export interface TBWLogger {
  info(msg: string, meta?: unknown): void
  warn(msg: string, meta?: unknown): void
  error(msg: string, meta?: unknown): void
}

/**
 * Configuration options for TokenBirthWatcher.
 */
export interface TokenBirthWatcherOptions {
  /** How long (ms) to keep events before automatic purge */
  ttlMs?: number
  /** Maximum number of events to retain (oldest removed first) */
  maxHistory?: number
  /** Callback invoked on each new mint detection (exceptions are caught) */
  onNewMint?: (evt: MintEvent) => void
  /** Optional logger (defaults to console.*) */
  logger?: TBWLogger
  /** Normalize incoming mint strings (e.g., to lowercase/trim) */
  normalizeMint?: (mint: string) => string
  /** Inject clock for tests (defaults to Date.now) */
  now?: () => number
}

/** Serialized snapshot for persistence */
export interface TokenBirthWatcherState {
  events: MintEvent[]
}

/**
 * Watches for new token mints, logs and retains a history with auto-cleanup.
 * Improvements:
 * - Pluggable logger & normalization
 * - Deterministic cleanup that updates the seen set correctly
 * - Single-mint add API with boolean return
 * - Stats helpers, hasSeen/remove/reset/load/save
 * - Safe onNewMint execution (won’t throw)
 */
export class TokenBirthWatcher {
  private seen = new Set<string>()
  private events: MintEvent[] = []
  private options: Required<
    Omit<TokenBirthWatcherOptions, "logger" | "normalizeMint" | "onNewMint" | "now">
  > & {
    logger: TBWLogger
    normalizeMint: (mint: string) => string
    onNewMint: (evt: MintEvent) => void
    now: () => number
  }

  constructor(options?: TokenBirthWatcherOptions) {
    const logger: TBWLogger = options?.logger ?? {
      info: (m, meta) => console.info("[TokenBirthWatcher]", m, meta ?? ""),
      warn: (m, meta) => console.warn("[TokenBirthWatcher]", m, meta ?? ""),
      error: (m, meta) => console.error("[TokenBirthWatcher]", m, meta ?? ""),
    }

    this.options = {
      ttlMs: options?.ttlMs ?? 24 * 60 * 60 * 1000, // 1 day
      maxHistory: options?.maxHistory ?? 1000,
      onNewMint: options?.onNewMint ?? (() => {}),
      logger,
      normalizeMint: options?.normalizeMint ?? ((s) => s.trim().toLowerCase()),
      now: options?.now ?? (() => Date.now()),
    }
  }

  /** Add a single mint. Returns true if it was new. */
  public add(mint: string): boolean {
    const norm = this.options.normalizeMint(mint)
    const now = this.options.now()
    if (!norm) return false

    if (this.seen.has(norm)) {
      return false
    }

    this.seen.add(norm)
    const evt: MintEvent = { mint: norm, timestamp: now }
    this.events.push(evt)
    this.options.logger.info("New mint detected", evt)
    try {
      this.options.onNewMint(evt)
    } catch (e) {
      this.options.logger.error("onNewMint callback threw", { error: e })
    }

    this.cleanup(now)
    return true
  }

  /**
   * Detects which of the provided mints are new.
   * Adds them to history, invokes hook and returns the list.
   */
  public detect(mints: string[]): MintEvent[] {
    const now = this.options.now()
    const newEvents: MintEvent[] = []

    for (const raw of mints) {
      const norm = this.options.normalizeMint(raw)
      if (!norm) continue
      if (!this.seen.has(norm)) {
        this.seen.add(norm)
        const evt: MintEvent = { mint: norm, timestamp: now }
        this.events.push(evt)
        newEvents.push(evt)
        this.options.logger.info("New mint detected", evt)
        try {
          this.options.onNewMint(evt)
        } catch (e) {
          this.options.logger.error("onNewMint callback threw", { error: e })
        }
      }
    }

    this.cleanup(now)
    return newEvents
  }

  /** Returns a snapshot of all recorded events (newest last) */
  public getAll(): MintEvent[] {
    return [...this.events]
  }

  /** Returns only events since a timestamp (ms) */
  public getSince(sinceMs: number): MintEvent[] {
    return this.events.filter((e) => e.timestamp >= sinceMs)
  }

  /** Has the mint been seen (after normalization) */
  public hasSeen(mint: string): boolean {
    return this.seen.has(this.options.normalizeMint(mint))
  }

  /** Remove a mint from seen set and history; returns true if removed */
  public remove(mint: string): boolean {
    const norm = this.options.normalizeMint(mint)
    const beforeLen = this.events.length
    this.events = this.events.filter((e) => e.mint !== norm)
    // Recompute seen membership only if it existed
    const deletedFromSeen = this.seen.delete(norm)
    if (deletedFromSeen) {
      // If another event still references this mint, re-add to seen
      if (this.events.some((e) => e.mint === norm)) {
        this.seen.add(norm)
      }
    }
    return deletedFromSeen || this.events.length !== beforeLen
  }

  /** Clears seen set and history. */
  public reset(): void {
    this.seen.clear()
    this.events = []
    this.options.logger.info("State has been reset")
  }

  /** Export current state for persistence */
  public save(): TokenBirthWatcherState {
    return { events: this.getAll() }
  }

  /** Load state (replaces current). Invalid/expired events are dropped. */
  public load(state: TokenBirthWatcherState): void {
    const now = this.options.now()
    const valid = (state?.events ?? []).filter(
      (e) =>
        e &&
        typeof e.mint === "string" &&
        Number.isFinite(e.timestamp) &&
        now - e.timestamp <= this.options.ttlMs
    )
    valid.sort((a, b) => a.timestamp - b.timestamp)
    this.events = valid
    this.seen.clear()
    for (const e of this.events) this.seen.add(this.options.normalizeMint(e.mint))
    this.enforceMaxHistory(now)
  }

  /** Quick stats */
  public getStats(): { total: number; unique: number; oldest?: number; newest?: number } {
    const total = this.events.length
    const unique = this.seen.size
    const oldest = total ? this.events[0].timestamp : undefined
    const newest = total ? this.events[total - 1].timestamp : undefined
    return { total, unique, oldest, newest }
  }

  /**
   * Removes events older than ttl or when history exceeds maxHistory.
   * Keeps the seen set in sync with remaining events.
   */
  private cleanup(now: number): void {
    const { ttlMs } = this.options
    if (this.events.length === 0) return

    // TTL purge
    const before = this.events.length
    this.events = this.events.filter((evt) => now - evt.timestamp <= ttlMs)
    const ttlPurged = before - this.events.length
    if (ttlPurged > 0) {
      this.options.logger.warn(`Purged ${ttlPurged} expired events (TTL)`)
    }

    // Rebuild seen set from retained events (correct and simple)
    this.seen = new Set(this.events.map((e) => e.mint))

    // Enforce maxHistory (oldest-first)
    this.enforceMaxHistory(now)
  }

  private enforceMaxHistory(now: number): void {
    const { maxHistory } = this.options
    if (this.events.length <= maxHistory) return
    const removeCount = this.events.length - maxHistory
    this.events.splice(0, removeCount)
    // Rebuild seen set again to reflect trimmed history
    this.seen = new Set(this.events.map((e) => e.mint))
    this.options.logger.warn(`Purged ${removeCount} oldest events to enforce maxHistory`, {
      remaining: this.events.length,
      now,
    })
  }
}
