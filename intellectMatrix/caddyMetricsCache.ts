export interface MetricsEntry {
  key: string
  value: number
  timestamp: number
}

export class CaddyMetricsCache {
  private store = new Map<string, MetricsEntry[]>()
  private retentionMs = 1000 * 60 * 60

  add(entry: MetricsEntry): void {
    const list = this.store.get(entry.key) || []
    list.push(entry)
    const cutoff = Date.now() - this.retentionMs
    this.store.set(entry.key, list.filter(e => e.timestamp >= cutoff))
  }

  get(key: string, sinceMs: number): MetricsEntry[] {
    const cutoff = Date.now() - sinceMs
    return (this.store.get(key) || []).filter(e => e.timestamp >= cutoff)
  }

  summary(key: string, windowMs: number): { count: number; avg: number; max: number } {
    const entries = this.get(key, windowMs)
    const count = entries.length
    const values = entries.map(e => e.value)
    const avg = count ? values.reduce((a, b) => a + b, 0) / count : 0
    const max = count ? Math.max(...values) : 0
    return { count, avg, max }
  }
}
