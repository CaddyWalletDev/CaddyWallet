import { Connection, PublicKey } from '@solana/web3.js'

export interface TokenInfo {
  mint: PublicKey
  name: string
  symbol: string
  decimals: number
}

export class TokenSleuthClient {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  async getTokenInfo(mintAddress: string): Promise<TokenInfo> {
    const mint = new PublicKey(mintAddress)
    const account = await this.connection.getParsedAccountInfo(mint)
    const data: any = (account.value?.data as any).parsed.info
    return {
      mint,
      name: data.name,
      symbol: data.symbol,
      decimals: data.decimals
    }
  }

  async getHolders(mintAddress: string, limit: number = 100): Promise<string[]> {
    const mint = new PublicKey(mintAddress)
    const largest = await this.connection.getTokenLargestAccounts(mint)
    const list = largest.value.slice(0, limit)
    return list.map(item => item.address.toBase58())
  }

  async getSupply(mintAddress: string): Promise<string> {
    const mint = new PublicKey(mintAddress)
    const info = await this.connection.getTokenSupply(mint)
    return info.value.amount
  }
}
