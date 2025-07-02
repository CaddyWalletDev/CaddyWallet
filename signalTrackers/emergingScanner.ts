import { Connection, PublicKey, ParsedConfirmedTransaction } from '@solana/web3.js'

export class EmergingScanner {
  private connection: Connection
  private windowMs: number
  private threshold: number

  constructor(rpcUrl: string, windowMs: number = 60000, threshold: number = 100) {
    this.connection = new Connection(rpcUrl, 'confirmed')
    this.windowMs = windowMs
    this.threshold = threshold
  }

  async scan(addresses: string[]): Promise<string[]> {
    const now = Date.now()
    const emerging: Set<string> = new Set()
    for (const addr of addresses) {
      const sigs = await this.connection.getSignaturesForAddress(new PublicKey(addr), { limit: 50 })
      const recent = sigs.filter(s => now - (s.blockTime ?? 0) * 1000 <= this.windowMs)
      if (recent.length >= this.threshold) {
        emerging.add(addr)
      }
    }
    return Array.from(emerging)
  }

  async getEmergenceRates(addresses: string[]): Promise<Record<string, number>> {
    const now = Date.now()
    const rates: Record<string, number> = {}
    for (const addr of addresses) {
      const sigs = await this.connection.getSignaturesForAddress(new PublicKey(addr), { limit: 100 })
      const count = sigs.filter(s => now - (s.blockTime ?? 0) * 1000 <= this.windowMs).length
      rates[addr] = count / (this.windowMs / 1000)
    }
    return rates
  }
}
