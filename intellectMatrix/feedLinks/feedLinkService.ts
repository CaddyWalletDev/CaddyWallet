import { FeedFetcher, FeedItem } from './feedFetcher'
import EventEmitter from 'events'

export class FeedLinkService extends EventEmitter {
  private seen = new Set<string>()
  private interval?: NodeJS.Timeout

  constructor(private fetcher: FeedFetcher, private intervalMs: number = 60000) {
    super()
  }

  start(): void {
    if (this.interval) return
    this.interval = setInterval(() => this.pull(), this.intervalMs)
    this.pull()
  }

  stop(): void {
    if (!this.interval) return
    clearInterval(this.interval)
    this.interval = undefined
  }

  private async pull(): Promise<void> {
    const items = await this.fetcher.fetchAll()
    items.sort((a, b) => b.publishedAt - a.publishedAt)
    for (const item of items) {
      if (!this.seen.has(item.id)) {
        this.seen.add(item.id)
        this.emit('link', item as FeedItem)
      }
    }
  }

  listRecent(limit: number): FeedItem[] {
    const all = Array.from(this.seen)
    return all.slice(-limit).map(id => ({ id, title: '', url: '', publishedAt: 0 }))
  }
}
