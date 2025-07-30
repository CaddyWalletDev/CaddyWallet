/**
 * Represents a mint event with timestamp.
 */
export interface MintEvent {
  mint: string
  timestamp: number
}

/**
 * Configuration options for TokenBirthWatcher.
 */
export interface TokenBirthWatcherOptions {
  /** How long (ms) to keep events before automatic purge */
  ttlMs?: number
  /** Maximum number of events to retain (oldest removed first) */
  maxHistory?: number
  /** Callback invoked on each new mint detection */
  onNewMint?: (evt: MintEvent) => void
}

/**
 * Watches for new token mints, logs and retains a history with auto‑cleanup.
 */
export class TokenBirthWatcher {
  private seen = new Set<string>()
  private events: MintEvent[] = []
  private options: Required<TokenBirthWatcherOptions>

  constructor(options?: TokenBirthWatcherOptions) {
    this.options = {
      ttlMs: options?.ttlMs ?? 24 * 60 * 60 * 1000,    // default 1 day
      maxHistory: options?.maxHistory ?? 1000,         // default 1000 events
      onNewMint: options?.onNewMint ?? (() => {}),     // no-op by default
    }
  }

  /**
   * Detects which of the provided mints are new.
   * Adds them to history, invokes hook and returns the list.
   */
  public detect(mints: string[]): MintEvent[] {
    const now = Date.now()
    const newEvents: MintEvent[] = []

    for (const mint of mints) {
      if (!this.seen.has(mint)) {
        this.seen.add(mint)
        const evt: MintEvent = { mint, timestamp: now }
        this.events.push(evt)
        newEvents.push(evt)
        this.log('info', `New mint detected: ${mint}`, evt)
        this.options.onNewMint(evt)
      }
    }

    this.cleanup(now)
    return newEvents
  }

  /**
   * Returns a snapshot of all recorded events.
   */
  public getAll(): MintEvent[] {
    return [...this.events]
  }

  /**
   * Clears seen set and history.
   */
  public reset(): void {
    this.seen.clear()
    this.events = []
    this.log('info', 'TokenBirthWatcher state has been reset')
  }

  /**
   * Removes events older than ttl or when history exceeds maxHistory.
   */
  private cleanup(now: number): void {
    const { ttlMs, maxHistory } = this.options

    // purge by TTL
    this.events = this.events.filter(evt => now - evt.timestamp <= ttlMs)
    // enforce maxHistory
    if (this.events.length > maxHistory) {
      const removeCount = this.events.length - maxHistory
      const removed = this.events.splice(0, removeCount)
      removed.forEach(evt => this.seen.delete(evt.mint))
      this.log('warn', `Purged ${removeCount} oldest events to enforce maxHistory`)
    }
  }

  /**
   * Structured logging.
   */
  private log(level: 'info' | 'warn' | 'error', message: string, meta?: unknown): void {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      meta,
    }
    console[level]('[TokenBirthWatcher]', entry)
  }
}
