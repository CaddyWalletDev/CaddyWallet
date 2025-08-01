import { TokenCluster } from './tokenCluster'
import { zScores } from './utilCore'

export interface Anomaly {
  token: string
  transactionId: string
  deviation: number
}

/**
 * Detects anomalies in token transaction clusters based on z-score threshold.
 *
 * @param clusters  Array of TokenCluster (must have `token` and `transactions` with `id` and `amount`)
 * @param threshold z-score threshold (must be positive, default 2)
 * @returns         Array of Anomaly objects sorted by descending absolute deviation
 * @throws          Error on invalid input
 */
export function detectAnomalies(
  clusters: TokenCluster[],
  threshold: number = 2
): Anomaly[] {
  if (!Array.isArray(clusters)) {
    throw new TypeError(`clusters must be an array, got ${typeof clusters}`)
  }
  if (typeof threshold !== 'number' || isNaN(threshold) || threshold <= 0) {
    throw new RangeError(`threshold must be a positive number, got ${threshold}`)
  }

  const anomalies: Anomaly[] = []

  for (const cluster of clusters) {
    if (
      !cluster ||
      typeof cluster.token !== 'string' ||
      !Array.isArray(cluster.transactions)
    ) {
      console.warn(`Skipping invalid cluster:`, cluster)
      continue
    }

    const amounts = cluster.transactions.map(tx => {
      if (typeof tx.amount !== 'number' || isNaN(tx.amount)) {
        throw new TypeError(`Transaction amount must be a valid number, got ${tx.amount}`)
      }
      return tx.amount
    })

    if (amounts.length === 0) {
      continue
    }

    const scores = zScores(amounts)

    for (let i = 0; i < scores.length; i++) {
      const deviation = scores[i]
      if (Math.abs(deviation) >= threshold) {
        anomalies.push({
          token: cluster.token,
          transactionId: cluster.transactions[i].id,
          deviation,
        })
      }
    }
  }

  // Sort by descending absolute deviation
  return anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
}
