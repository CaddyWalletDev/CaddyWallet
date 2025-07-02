
import { LedgerScopeApi, LedgerEntry } from './ledgerScopeApi'


export interface LedgerSummary {
  totalIn: number
  totalOut: number
  netChange: number
  averageChange: number
}

export class LedgerScopeService extends EventEmitter {
  private api: LedgerScopeApi

  constructor(rpcUrl: string) {
    super()
    this.api = new LedgerScopeApi(rpcUrl)
  }

  async summarize(address: string, limit: number = 50): Promise<LedgerSummary> {
    const sigs = await this.api.fetchSignatures(address, limit)
    const entries = await this.api.fetchLedgerEntries(address, sigs)
    let totalIn = 0, totalOut = 0
    entries.forEach(e => {
      const delta = e.postBalance - e.preBalance
      if (delta >= 0) totalIn += delta
      else totalOut += delta
    })
    const netChange = totalIn + totalOut
    const avg = entries.length ? netChange / entries.length : 0
    return { totalIn, totalOut, netChange, averageChange: avg }
  }

  async watch(address: string, intervalMs: number = 30000): Promise<void> {
    let lastSeen = new Set<string>()
    setInterval(async () => {
      const sigs = await this.api.fetchSignatures(address, 20)
      const newSigs = sigs.filter(s => !lastSeen.has(s))
      if (newSigs.length) {
        const entries = await this.api.fetchLedgerEntries(address, newSigs)
        
        newSigs.forEach(s => lastSeen.add(s))
      }
    }, intervalMs)
  }
}
