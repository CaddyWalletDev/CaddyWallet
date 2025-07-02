export class TokenFluxAggregator {
  private fluxMap: Map<string, number[]> = new Map()

  add(mint: string, change: number): void {
    if (!this.fluxMap.has(mint)) {
      this.fluxMap.set(mint, [])
    }
    const arr = this.fluxMap.get(mint)!
    arr.push(change)
    if (arr.length > 100) {
      arr.shift()
    }
  }

  averageFlux(mint: string): number {
    const arr = this.fluxMap.get(mint) || []
    if (!arr.length) return 0
    const sum = arr.reduce((a, b) => a + b, 0)
    return sum / arr.length
  }

  topFlux(n: number): string[] {
    const scores: Array<{ mint: string; avg: number }> = []
    for (const [mint, arr] of this.fluxMap.entries()) {
      const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      scores.push({ mint, avg })
    }
    scores.sort((a, b) => b.avg - a.avg)
    return scores.slice(0, n).map(s => s.mint)
  }
}
