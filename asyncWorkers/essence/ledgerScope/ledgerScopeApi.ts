
import { Connection, PublicKey, ParsedConfirmedTransaction, Commitment } from '@solana/web3.js'

export interface LedgerEntry {
  signature: string
  slot: number
  timestamp: number
  preBalance: number
  postBalance: number
}

export class LedgerScopeApi {
  private connection: Connection

  constructor(rpcUrl: string, commitment: Commitment = 'confirmed') {
    this.connection = new Connection(rpcUrl, commitment)
  }

  async fetchSignatures(address: string, limit: number = 100): Promise<string[]> {
    const pub = new PublicKey(address)
    const sigs = await this.connection.getSignaturesForAddress(pub, { limit })
    return sigs.map(s => s.signature)
  }

  async fetchLedgerEntries(address: string, signatures: string[]): Promise<LedgerEntry[]> {
    const pub = new PublicKey(address)
    const entries: LedgerEntry[] = []
    for (const sig of signatures) {
      const tx = await this.connection.getParsedTransaction(sig)
      if (!tx || !tx.meta) continue
      const idx = tx.transaction.message.accountKeys.findIndex(k => k.pubkey.equals(pub))
      if (idx === -1) continue
      const pre = tx.meta.preBalances[idx]
      const post = tx.meta.postBalances[idx]
      entries.push({
        signature: sig,
        slot: tx.slot,
        timestamp: (tx.blockTime ?? 0) * 1000,
        preBalance: pre,
        postBalance: post
      })
    }
    return entries
  }
}
