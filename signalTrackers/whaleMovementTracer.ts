import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js'

export interface WhaleMovement {
  signature: string
  from: string
  to: string
  amount: number      // UI amount (human-readable tokens)
  timestamp: number   // ms since epoch
}

export class WhaleMovementTracer {
  private connection: Connection
  private minAmount: number

  constructor(rpcUrl: string, minAmount: number = 1_000_000) {
    this.connection = new Connection(rpcUrl, 'confirmed')
    this.minAmount = minAmount
  }

  async trace(mints: string[], limit: number = 100): Promise<WhaleMovement[]> {
    const moves: WhaleMovement[] = []

    for (const mint of mints) {
      const mintKey = new PublicKey(mint)
      const sigs = await this.connection.getSignaturesForAddress(mintKey, { limit })

      for (const { signature } of sigs) {
        const tx = await this.connection.getParsedTransaction(signature, 'confirmed') as ParsedTransactionWithMeta | null
        if (!tx?.meta) continue

        const blockTime = (tx.blockTime ?? 0) * 1000

        // Build pre/post token balances for this mint
        const pre = new Map<number, number>()
        for (const b of tx.meta.preTokenBalances ?? []) {
          if (b.mint === mint) {
            pre.set(b.accountIndex, Number(b.uiTokenAmount.uiAmount ?? 0))
          }
        }

        for (const b of tx.meta.postTokenBalances ?? []) {
          if (b.mint !== mint) continue
          const before = pre.get(b.accountIndex) ?? 0
          const after = Number(b.uiTokenAmount.uiAmount ?? 0)
          const delta = after - before

          if (Math.abs(delta) >= this.minAmount) {
            if (delta > 0) {
              moves.push({
                signature,
                from: '',
                to: b.owner ?? '',
                amount: delta,
                timestamp: blockTime,
              })
            } else {
              moves.push({
                signature,
                from: b.owner ?? '',
                to: '',
                amount: Math.abs(delta),
                timestamp: blockTime,
              })
            }
          }
        }
      }
    }

    moves.sort((a, b) => a.timestamp - b.timestamp)
    return moves
  }
}
