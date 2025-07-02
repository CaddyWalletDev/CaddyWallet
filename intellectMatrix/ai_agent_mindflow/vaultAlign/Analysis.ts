import { CaddyfiEngine } from './caddyfiEngine'

export interface OnChainMetric {
  timestamp: number
  volume: number
  liquidity: number
  activeAddresses: number
}

export interface CorrelationResult {
  pair: readonly [keyof OnChainMetric, keyof OnChainMetric]
  coefficient: number
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n === 0 || y.length !== n) return 0

  const meanX = x.reduce((s, v) => s + v, 0) / n
  const meanY = y.reduce((s, v) => s + v, 0) / n

  let num = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    num += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denom = Math.sqrt(denomX * denomY)
  return denom === 0 ? 0 : num / denom
}

export class CaddyfiCorrelationAnalyzer {
  private engine: CaddyfiEngine

  constructor(apiUrl: string, apiKey: string) {
    this.engine = new CaddyfiEngine(apiUrl, apiKey)
  }

  async analyze(
    contractAddress: string,
    periodHours: number
  ): Promise<CorrelationResult[]> {
    const metrics = await this.engine.fetchMetrics(contractAddress, periodHours) as OnChainMetric[]
    if (!metrics.length) return []

    const keys: (keyof OnChainMetric)[] = ['volume', 'liquidity', 'activeAddresses']
    const seriesMap = keys.reduce((acc, key) => {
      acc[key] = metrics.map(m => m[key])
      return acc
    }, {} as Record<keyof OnChainMetric, number[]>)

    const results: CorrelationResult[] = []

    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i], b = keys[j]
        const coeff = pearsonCorrelation(seriesMap[a], seriesMap[b])
        results.push({ pair: [a, b], coefficient: coeff })
      }
    }

    return results
  }
}
