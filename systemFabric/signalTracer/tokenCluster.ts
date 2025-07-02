import { Transaction } from './types'
import { calculateMean, calculateStd } from './utilCore'

export interface TokenCluster {
  token: string
  transactions: Transaction[]
  totalAmount: number
  averageAmount: number
  stdDeviation: number
}

export function clusterTransactionsByToken(
  txns: Transaction[]
): TokenCluster[] {
  const group: Record<string, Transaction[]> = {}
  for (const tx of txns) {
    if (!group[tx.token]) group[tx.token] = []
    group[tx.token].push(tx)
  }

  const clusters: TokenCluster[] = []
  for (const token of Object.keys(group)) {
    const list = group[token]
    const amounts = list.map(t => t.amount)
    const total = amounts.reduce((sum, a) => sum + a, 0)
    const avg = calculateMean(amounts)
    const std = calculateStd(amounts)

    clusters.push({
      token,
      transactions: list,
      totalAmount: total,
      averageAmount: avg,
      stdDeviation: std
    })
  }

  return clusters
}
