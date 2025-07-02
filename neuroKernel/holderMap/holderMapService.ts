import { HolderMap, HolderEntry } from './holderMap'

export class HolderMapService {
  private holderMap = new HolderMap()

  async refresh(mint: string, fetchHolders: () => Promise<HolderEntry[]>): Promise<void> {
    const entries = await fetchHolders()
    this.holderMap.update(mint, entries)
  }

  subscribe(
    mint: string,
    fetchHolders: () => Promise<HolderEntry[]>,
    intervalMs: number,
    onChange: (summary: { totalHolders: number; totalBalance: number }) => void
  ): NodeJS.Timeout {
    const tick = async () => {
      await this.refresh(mint, fetchHolders)
      const summary = this.holderMap.summarize(mint)
      onChange(summary)
    }
    tick()
    return setInterval(tick, intervalMs)
  }

  unsubscribe(timer: NodeJS.Timeout): void {
    clearInterval(timer)
  }

  getSummary(mint: string): { totalHolders: number; totalBalance: number } {
    return this.holderMap.summarize(mint)
  }

  getHolders(mint: string): HolderEntry[] {
    return this.holderMap.getHolders(mint)
  }
}
