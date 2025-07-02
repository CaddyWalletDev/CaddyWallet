import { AssetShiftApi, ShiftRecord } from './assetShiftApi'
import EventEmitter from 'events'

export class AssetShiftManager extends EventEmitter {
  private api: AssetShiftApi
  private tracked: Set<string> = new Set()
  private seen: Map<string, Set<string>> = new Map()

  constructor(rpcUrl: string) {
    super()
    this.api = new AssetShiftApi(rpcUrl)
  }

  async track(address: string): Promise<void> {
    if (!this.seen.has(address)) {
      this.seen.set(address, new Set())
    }
    const seenSet = this.seen.get(address)!
    const records = await this.api.fetchRecentShifts(address)
    for (const record of records) {
      if (!seenSet.has(record.signature)) {
        this.emit('shift', record)
        seenSet.add(record.signature)
      }
    }
  }

  start(addresses: string[], intervalMs: number = 20000): void {
    addresses.forEach(addr => this.tracked.add(addr))
    setInterval(async () => {
      for (const addr of this.tracked) {
        await this.track(addr)
      }
    }, intervalMs)
  }

  stop(): void {
    this.tracked.clear()
    this.seen.clear()
  }
}
