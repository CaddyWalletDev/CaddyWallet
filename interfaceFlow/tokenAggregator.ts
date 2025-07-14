export class TokenFluxAggregator {
  private fluxMap = new Map<string, { change: number; timestamp: number }[]>()

  constructor(private historyLimit = 100, private windowMs?: number) {}

  add(mint: string, change: number): void {
    const now = Date.now()
    const list = this.fluxMap.get(mint) || []
    list.push({ change, timestamp: now })
    if (list.length > this.historyLimit) list.shift()
    if (this.windowMs != null) {
      while (list.length && now - list[0].timestamp > this.windowMs) {
        list.shift()
      }
    }
    this.fluxMap.set(mint, list)
  }

  averageFlux(mint: string): number {
    const list = this.fluxMap.get(mint) || []
    if (!list.length) return 0
    const sum = list.reduce((acc, rec) => acc + rec.change, 0)
    return sum / list.length
  }

  fluxStdDev(mint: string): number {
    const list = this.fluxMap.get(mint) || []
    const n = list.length
    if (n < 2) return 0
    const mean = this.averageFlux(mint)
    const variance =
      list.reduce((acc, rec) => acc + (rec.change - mean) ** 2, 0) /
      (n - 1)
    return Math.sqrt(variance)
  }

  topFlux(n: number): string[] {
    const scores: Array<{ mint: string; avg: number }> = []
    for (const [mint, list] of this.fluxMap) {
      const avg = list.length
        ? list.reduce((acc, rec) => acc + rec.change, 0) / list.length
        : 0
      scores.push({ mint, avg })
    }
    return scores
      .sort((a, b) => b.avg - a.avg)
      .slice(0, n)
      .map(s => s.mint)
  }

  reset(): void {
    this.fluxMap.clear()
  }
}
