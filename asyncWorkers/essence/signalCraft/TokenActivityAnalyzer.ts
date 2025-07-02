import { Connection, PublicKey, ParsedConfirmedTransaction } from '@solana/web3.js'

export class TokenActivityAnalyzer {
  constructor(private rpcUrl: string, private windowMs: number = 60000) {}

  private connection = new Connection(this.rpcUrl, 'confirmed')

  async analyze(address: string, limit: number = 100): Promise<{ transfers: number; totalVolume: number }> {
    const pub = new PublicKey(address)
    const sigs = await this.connection.getSignaturesForAddress(pub, { limit })
    let transfers = 0, totalVolume = 0
    const cutoff = Date.now() - this.windowMs
    for (const { signature, blockTime } of sigs) {
      if ((blockTime ?? 0) * 1000 < cutoff) continue
      const tx = await this.connection.getParsedTransaction(signature)
      if (!tx?.meta) continue
      tx.transaction.message.instructions.forEach(instr => {
        if ('parsed' in (instr as any) && instr.program === 'spl-token') {
          transfers++
          const info = (instr as any).parsed.info
          totalVolume += Number(info.amount)
        }
      })
    }
    return { transfers, totalVolume }
  }
}
