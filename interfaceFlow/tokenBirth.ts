export class TokenBirthWatcher {
  private seen: Set<string> = new Set()
  private events: Array<{ mint: string; timestamp: number }> = []

  detect(mints: string[]): Array<{ mint: string; timestamp: number }> {
    const newMints: Array<{ mint: string; timestamp: number }> = []
    const now = Date.now()
    for (const mint of mints) {
      if (!this.seen.has(mint)) {
        this.seen.add(mint)
        const evt = { mint, timestamp: now }
        this.events.push(evt)
        newMints.push(evt)
      }
    }
    return newMints
  }

  getAll(): Array<{ mint: string; timestamp: number }> {
    return [...this.events]
  }
}
