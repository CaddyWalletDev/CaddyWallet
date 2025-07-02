import { FundFlowApi, FlowRecord } from './fundFlowApi'
import EventEmitter from 'events'

export class FundFlowProcessor extends EventEmitter {
  private api: FundFlowApi
  private tracked: Set<string> = new Set()
  private seen: Map<string, string[]> = new Map()

  constructor(rpcUrl: string) {
    super()
    this.api = new FundFlowApi(rpcUrl)
  }

  async track(address: string): Promise<void> {
    if (!this.seen.has(address)) this.seen.set(address, [])
    const signatures = await this.api.fetchSignatures(address)
    const processed = this.seen.get(address) || []
    for (const sig of signatures.filter(s => !processed.includes(s))) {
      const change = await this.api.fetchBalanceChange(address, sig)
      const record: FlowRecord = { address, signature: sig, change, timestamp: Date.now() }
      this.emit('flow', record)
      processed.push(sig)
    }
    this.seen.set(address, processed)
  }

  start(addresses: string[], intervalMs: number = 15000): void {
    addresses.forEach(addr => this.tracked.add(addr))
    setInterval(() => {
      this.tracked.forEach(addr => this.track(addr))
    }, intervalMs)
  }

  stop(): void {
    this.tracked.clear()
  }
}
