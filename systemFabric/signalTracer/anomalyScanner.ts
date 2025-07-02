import { TokenCluster } from './tokenCluster'
import { zScores } from './utilCore'

export interface Anomaly {
  token: string
  transactionId: string
  deviation: number
}

export function detectAnomalies(
  clusters: TokenCluster[],
  threshold: number = 2
): Anomaly[] {
  const anomalies: Anomaly[] = []

  for (const cluster of clusters) {
    const scores = zScores(cluster.transactions.map(t => t.amount))
    for (let i = 0; i < scores.length; i++) {
      const score = scores[i]
      if (Math.abs(score) >= threshold) {
        anomalies.push({
          token: cluster.token,
          transactionId: cluster.transactions[i].id,
          deviation: score
        })
      }
    }
  }

  return anomalies
}
