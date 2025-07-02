import { Connection, PublicKey, ParsedConfirmedTransaction, Commitment } from '@solana/web3.js'

export interface ShiftRecord {
  address: string
  signature: string
  delta: number
  slot: number
}

export class AssetShiftApi {
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

  async fetchShiftRecord(address: string, signature: string): Promise<ShiftRecord | null> {
    const tx = await this.connection.getParsedTransaction(signature, this.commitment)
    if (!tx || !tx.meta) return null
    const pre = tx.meta.preBalances.find((_, i) => tx.transaction.accountKeys[i].toBase58() === address) ?? 0
    const post = tx.meta.postBalances.find((_, i) => tx.transaction.accountKeys[i].toBase58() === address) ?? 0
    const delta = post - pre
    return { address, signature, delta, slot: tx.slot }
  }

  async fetchRecentShifts(address: string, limit: number = 50): Promise<ShiftRecord[]> {
    const sigs = await this.fetchSignatures(address, limit)
    const promises = sigs.map(sig => this.fetchShiftRecord(address, sig))
    const records = await Promise.all(promises)
    return records.filter((r): r is ShiftRecord => r !== null && r.delta !== 0)
  }
}
