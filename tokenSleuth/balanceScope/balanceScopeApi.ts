import { Connection, PublicKey, AccountInfo } from '@solana/web3.js'

export interface TokenBalance {
  address: string
  mint: string
  amount: number
}

export class BalanceScopeApi {
  private connection: Connection

  constructor(rpcUrl: string, commitment: 'confirmed' | 'finalized' = 'confirmed') {
    this.connection = new Connection(rpcUrl, commitment)
  }

  async getTokenAccounts(address: string, mint?: string): Promise<AccountInfo<Buffer>[]> {
    const pub = new PublicKey(address)
    const resp = await this.connection.getParsedTokenAccountsByOwner(pub, {
      mint: mint ? new PublicKey(mint) : undefined
    })
    return resp.value.map(v => v.account)
  }

  async getMultipleBalances(addresses: string[], mintFilter?: string): Promise<TokenBalance[]> {
    const results: TokenBalance[] = []
    for (const addr of addresses) {
      const infos = await this.getTokenAccounts(addr, mintFilter)
      for (const info of infos) {
        const raw = (info.data as any).parsed.info.tokenAmount
        results.push({
          address: addr,
          mint: raw.mint,
          amount: Number(raw.uiAmountString)
        })
      }
    }
    return results
  }

  async getNativeBalances(addresses: string[]): Promise<Array<{ address: string; lamports: number }>> {
    const out: Array<{ address: string; lamports: number }> = []
    for (const addr of addresses) {
      const pub = new PublicKey(addr)
      const lamports = await this.connection.getBalance(pub)
      out.push({ address: addr, lamports })
    }
    return out
  }
}
