export class SurgeSignalProbe {
  private threshold: number
  private history: Array<{ timestamp: number; change: number }> = []

  constructor(threshold: number = 0.05) {
    this.threshold = threshold
  }

  record(change: number): boolean {
    const now = Date.now()
    this.history.push({ timestamp: now, change })
    if (change >= this.threshold) {
      return true
    }
    return false
  }

  getRecent(count: number): Array<{ timestamp: number; change: number }> {
    return this.history.slice(-count)
  }
}
