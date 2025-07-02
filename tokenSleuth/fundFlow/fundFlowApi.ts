import { Connection, PublicKey, ParsedConfirmedTransaction, Commitment } from '@solana/web3.js'

export interface FlowRecord {
  address: string
  signature: string
  change: number
  timestamp: number
}

export class FundFlowApi {
  private connection: Connection
  private commitment: Commitment

  constructor(rpcUrl: string, commitment: Commitment = 'confirmed') {
    this.connection = new Connection(rpcUrl, commitment)
    this.commitment = commitment
  }

  async fetchSignatures(address: string, limit: number = 100): Promise<string[]> {
    const pub = new PublicKey(address)
    const sigs = await this.connection.getSignaturesForAddress(pub, { limit })
    return sigs.map(s => s.signature)
  }

  async fetchTransaction(signature: string): Promise<ParsedConfirmedTransaction | null> {
    return this.connection.getParsedTransaction(signature, this.commitment)
  }

  async fetchBalanceChange(address: string, signature: string): Promise<number> {
    const tx = await this.fetchTransaction(signature)
    const pre = tx?.meta?.preBalances?.find((_, i) => tx.transaction.accountKeys[i].toBase58() === address) ?? 0
    const post = tx?.meta?.postBalances?.find((_, i) => tx.transaction.accountKeys[i].toBase58() === address) ?? 0
    return post - pre
  }
}
