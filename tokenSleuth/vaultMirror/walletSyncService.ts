import { Connection, PublicKey, ParsedConfirmedTransaction } from '@solana/web3.js'
import EventEmitter from 'events'

export class WalletSyncService extends EventEmitter {
  private connection: Connection
  private tracked: Set<string> = new Set()
  private lastSignatures: Map<string, string> = new Map()

  constructor(rpcUrl: string) {
    super()
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  async track(address: string): Promise<void> {
    if (this.tracked.has(address)) return
    this.tracked.add(address)
    this.lastSignatures.set(address, '')
    await this.pollAddress(address)
  }

  async untrack(address: string): Promise<void> {
    this.tracked.delete(address)
    this.lastSignatures.delete(address)
  }

  private async pollAddress(address: string): Promise<void> {
    const pub = new PublicKey(address)
    const last = this.lastSignatures.get(address) || ''
    const options = last ? { until: last, limit: 20 } : { limit: 20 }
    const list = await this.connection.getSignaturesForAddress(pub, options as any)
    if (list.length) {
      const newSig = list[0].signature
      this.lastSignatures.set(address, newSig)
      for (const entry of list.reverse()) {
        const tx = await this.connection.getParsedTransaction(entry.signature, 'confirmed')
        this.emit('transaction', { address, transaction: tx as ParsedConfirmedTransaction })
      }
    }
  }

  start(intervalMs: number): void {
    setInterval(() => {
      for (const address of this.tracked) {
        this.pollAddress(address)
      }
    }, intervalMs)
  }
}
