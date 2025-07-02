
export type SwapPair = [string, string]

export interface MatrixEntry {
  from: string
  to: string
  rate: number
  timestamp: number
}

export class SwapMatrix {
  compute(pairs: SwapPair[], rates: number[]): MatrixEntry[] {
    const now = Date.now()
    return pairs.map(([from, to], i) => ({
      from,
      to,
      rate: rates[i],
      timestamp: now
    }))
  }

  toGrid(entries: MatrixEntry[]): Record<string, Record<string, number>> {
    const grid: Record<string, Record<string, number>> = {}
    entries.forEach(e => {
      if (!grid[e.from]) grid[e.from] = {}
      grid[e.from][e.to] = e.rate
    })
    return grid
  }
}
