export type SwapPair = [string, string]

export interface MatrixEntry {
  from: string
  to: string
  rate: number
  timestamp: number
}

export class SwapMatrix {
  /**
   * Builds a list of MatrixEntry objects from swap pairs and rates
   */
  compute(pairs: SwapPair[], rates: number[]): MatrixEntry[] {
    const now = Date.now()
    const length = Math.min(pairs.length, rates.length)

    return pairs.slice(0, length).map(([from, to], i) => ({
      from,
      to,
      rate: rates[i],
      timestamp: now
    }))
  }

  /**
   * Converts entries into a 2D lookup grid
   */
  toGrid(entries: MatrixEntry[]): Record<string, Record<string, number>> {
    const grid: Record<string, Record<string, number>> = {}

    for (const e of entries) {
      if (!grid[e.from]) {
        grid[e.from] = {}
      }
      grid[e.from][e.to] = e.rate
    }

    return grid
  }

  /**
   * Looks up a rate directly from grid
   */
  getRate(
    grid: Record<string, Record<string, number>>,
    from: string,
    to: string
  ): number | null {
    return grid[from]?.[to] ?? null
  }

  /**
   * Finds all outgoing swaps from a token
   */
  getOutgoing(entries: MatrixEntry[], token: string): MatrixEntry[] {
    return entries.filter(e => e.from === token)
  }

  /**
   * Finds all incoming swaps to a token
   */
  getIncoming(entries: MatrixEntry[], token: string): MatrixEntry[] {
    return entries.filter(e => e.to === token)
  }
}
