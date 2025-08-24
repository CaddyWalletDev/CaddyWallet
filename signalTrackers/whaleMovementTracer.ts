import { Connection, PublicKey, ParsedTransactionWithMeta, SignatureStatus } from '@solana/web3.js'

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

  /**
   * Traces whale movements based on token transfers.
   * 
   * @param mints List of token mint addresses to trace
   * @param limit Limit of signatures per mint (default: 100)
   * @returns List of whale movements
   */
  async trace(mints: string[], limit: number = 100): Promise<WhaleMovement[]> {
    const moves: WhaleMovement[] = []

    for (const mint of mints) {
      const mintKey = new PublicKey(mint)
      let signatures: { signature: string }[] = []
      try {
        // Fetching all signatures for a given mint address with a limit
        signatures = await this.connection.getSignaturesForAddress(mintKey, { limit })
      } catch (error) {
        console.error(`Error fetching signatures for mint ${mint}:`, error)
        continue
      }

      for (const { signature } of signatures) {
        try {
          const tx = await this.connection.getParsedTransaction(signature, 'confirmed') as ParsedTransactionWithMeta | null
          if (!tx?.meta) continue

          const blockTime = (tx.blockTime ?? 0) * 1000

          // Pre-token balances (before transaction)
          const pre = new Map<number, number>()
          for (const b of tx.meta.preTokenBalances ?? []) {
            if (b.mint === mint) {
              pre.set(b.accountIndex, Number(b.uiTokenAmount.uiAmount ?? 0))
            }
          }

          // Post-token balances (after transaction)
          for (const b of tx.meta.postTokenBalances ?? []) {
            if (b.mint !== mint) continue
            const before = pre.get(b.accountIndex) ?? 0
            const after = Number(b.uiTokenAmount.uiAmount ?? 0)
            const delta = after - before

            if (Math.abs(delta) >= this.minAmount) {
              const whaleMove: WhaleMovement = {
                signature,
                amount: Math.abs(delta),
                timestamp: blockTime,
                from: delta > 0 ? '' : b.owner ?? '',
                to: delta > 0 ? b.owner ?? '' : '',
              }
              moves.push(whaleMove)
            }
          }
        } catch (err) {
          console.error(`Error processing transaction ${signature}:`, err)
        }
      }
    }

    // Sort movements by timestamp (ascending)
    moves.sort((a, b) => a.timestamp - b.timestamp)
    return moves
  }
}
