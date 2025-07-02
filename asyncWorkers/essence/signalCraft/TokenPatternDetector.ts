import { ParsedConfirmedTransaction, Connection } from '@solana/web3.js'

export class TokenPatternDetector {
  private history: Array<{ change: number; timestamp: number }> = []
  private connection: Connection

  constructor(private rpcUrl: string, private threshold: number = 0.1) {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  record(change: number): boolean {
    const now = Date.now()
    this.history.push({ change, timestamp: now })
    if (this.history.length > 50) this.history.shift()
    const recent = this.history.filter(h => now - h.timestamp < 60000)
    const spikes = recent.filter(h => Math.abs(h.change) >= this.threshold)
    return spikes.length >= 3
  }

  async detectMintPatterns(mint: string, limit: number = 100): Promise<Array<{ signature: string; change: number }>> {
    const sigs = await this.connection.getSignaturesForAddress(new PublicKey(mint), { limit })
    const patterns: Array<{ signature: string; change: number }> = []
    for (const { signature } of sigs) {
      const tx = await this.connection.getParsedTransaction(signature)
      const deltas = tx?.meta?.postTokenBalances?.map((b, i) => 
        (b.uiTokenAmount.uiAmount || 0) - (tx.meta?.preTokenBalances?.[i]?.uiTokenAmount.uiAmount || 0)
      ) || []
      deltas.forEach(delta => {
        if (Math.abs(delta) >= this.threshold) {
          patterns.push({ signature, change: delta })
        }
      })
    }
    return patterns
  }
}
