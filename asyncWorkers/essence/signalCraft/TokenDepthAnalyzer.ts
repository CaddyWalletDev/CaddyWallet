import { Connection, PublicKey } from '@solana/web3.js'

export class TokenDepthAnalyzer {
  constructor(private rpcUrl: string) {}

  private connection = new Connection(this.rpcUrl, 'confirmed')

  async computeDepth(mintAddress: string): Promise<{ bidDepth: number; askDepth: number }> {
    const mint = new PublicKey(mintAddress)
    const accounts = await this.connection.getTokenLargestAccounts(mint)
    let bidDepth = 0, askDepth = 0
    for (const acc of accounts.value.slice(0, 20)) {
      const info = await this.connection.getParsedAccountInfo(acc.address)
      const data: any = (info.value?.data as any).parsed.info
      const size = Number(data.tokenAmount.uiAmount)
      if (data.isNative) bidDepth += size
      else askDepth += size
    }
    return { bidDepth, askDepth }
  }
}
