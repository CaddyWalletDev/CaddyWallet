import { TokenCluster } from './tokenCluster'
import { Anomaly } from './anomalyScanner'
import { movingAverage, calculateStd } from './utilCore'

export interface TokenInsight {
  token: string
  totalVolume: number
  volatility: number
  movingAverages: number[]
  anomalyCount: number
}

export function analyzeTokenInsights(
  clusters: TokenCluster[],
  anomalies: Anomaly[],
  windowSize: number = 5
): TokenInsight[] {
  const insights: TokenInsight[] = []

  for (const cluster of clusters) {
    const volumes = cluster.transactions.map(t => t.amount)
    const ma = movingAverage(volumes, windowSize)
    const vol = calculateStd(volumes)
    const anomalyCount = anomalies.filter(a => a.token === cluster.token).length

    insights.push({
      token: cluster.token,
      totalVolume: cluster.totalAmount,
      volatility: vol,
      movingAverages: ma,
      anomalyCount
    })
  }

  return insights
}
