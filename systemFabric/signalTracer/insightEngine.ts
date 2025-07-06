import { TokenCluster } from './tokenCluster'
import { Anomaly } from './anomalyScanner'
import {
  movingAverage,
  calculateStd,
  percentile,
  linearRegressionSlope
} from './utilCore'

export interface TokenInsight {
  token: string
  totalVolume: number
  averageVolume: number
  maxVolume: number
  minVolume: number
  volatility: number                  // overall standard deviation
  volatilityWindowed: number[]       // rolling standard deviation over window
  movingAverages: number[]           // rolling mean over window
  percentiles: { p25: number; p50: number; p75: number }
  trendSlope: number                 // slope of volume trend
  anomalyCount: number
  anomalyRate: number                // anomalies per transaction
}

/**
 * Analyzes token clusters and anomalies to produce detailed statistical insights
 *
 * @param clusters    Array of token clusters (each with `.token` and `.transactions: { amount: number }[]`)
 * @param anomalies   Array of detected anomalies (linked via `.token`)
 * @param windowSize  Window size for moving-average and rolling-volatility (default: 5)
 * @returns           Array of TokenInsight objects, one per cluster
 */
export function analyzeTokenInsights(
  clusters: TokenCluster[],
  anomalies: Anomaly[],
  windowSize: number = 5
): TokenInsight[] {
  const insights: TokenInsight[] = []

  for (const cluster of clusters) {
    const amounts = cluster.transactions.map(t => t.amount)
    const count = amounts.length
    const anomalyCount = anomalies.filter(a => a.token === cluster.token).length

    // Handle empty cluster
    if (count === 0) {
      insights.push({
        token: cluster.token,
        totalVolume: 0,
        averageVolume: 0,
        maxVolume: 0,
        minVolume: 0,
        volatility: 0,
        volatilityWindowed: [],
        movingAverages: [],
        percentiles: { p25: 0, p50: 0, p75: 0 },
        trendSlope: 0,
        anomalyCount,
        anomalyRate: 0
      })
      continue
    }

    const totalVolume = cluster.totalAmount ?? amounts.reduce((sum, v) => sum + v, 0)
    const averageVolume = totalVolume / count
    const maxVolume = Math.max(...amounts)
    const minVolume = Math.min(...amounts)
    const volatility = calculateStd(amounts)

    // rolling metrics
    const movingAverages = movingAverage(amounts, windowSize)
    const volatilityWindowed = movingAverage(
      // apply std over each rolling window
      Array.from({ length: Math.max(0, count - windowSize + 1) }, (_, i) =>
        calculateStd(amounts.slice(i, i + windowSize))
      ),
      1
    )

    // percentiles
    const p25 = percentile(amounts, 25)
    const p50 = percentile(amounts, 50)
    const p75 = percentile(amounts, 75)

    // trend (slope of linear regression over sequence)
    const trendSlope = linearRegressionSlope(amounts)

    // anomaly rate
    const anomalyRate = anomalyCount / count

    insights.push({
      token: cluster.token,
      totalVolume,
      averageVolume,
      maxVolume,
      minVolume,
      volatility,
      volatilityWindowed,
      movingAverages,
      percentiles: { p25, p50, p75 },
      trendSlope,
      anomalyCount,
      anomalyRate
    })
  }

  return insights
}
