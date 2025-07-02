import { Connection, PublicKey, ParsedConfirmedTransaction } from '@solana/web3.js'

export interface WhaleMovement {
  signature: string
  from: string
  to: string
  amount: number
  timestamp: number
}

export class WhaleMovementTracer {
  private connection: Connection
  private minAmount: number

  constructor(rpcUrl: string, minAmount: number = 1000000) {
    this.connection = new Connection(rpcUrl, 'confirmed')
    this.minAmount = minAmount
  }

  async trace(mints: string[], limit: number = 100): Promise<WhaleMovement[]> {
    const moves: WhaleMovement[] = []
    for (const mint of mints) {
      const pub = new PublicKey(mint)
      const sigs = await this.connection.getSignaturesForAddress(pub, { limit })
      for (const { signature } of sigs) {
        const tx = await this.connection.getParsedTransaction(signature, 'confirmed')
        const meta = tx?.meta
        const info = (tx?.transaction.message.accountKeys ?? []).map((k, i) => ({
          address: k.toBase58(),
          pre: meta?.preBalances?.[i] ?? 0,
          post: meta?.postBalances?.[i] ?? 0
        }))
        for (const entry of info) {
          const change = entry.post - entry.pre
          if (Math.abs(change) >= this.minAmount) {
            moves.push({
              signature,
              from: entry.pre < entry.post ? entry.address : '',
              to: entry.post > entry.pre ? entry.address : '',
              amount: change,
              timestamp: (tx.blockTime ?? 0) * 1000
            })
          }
        }
      }
    }
    return moves
  }
}
