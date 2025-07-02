import fetch from 'node-fetch'

export interface FeedItem {
  id: string
  title: string
  url: string
  publishedAt: number
}

export class FeedFetcher {
  constructor(private endpoints: string[]) {}

  async fetchAll(): Promise<FeedItem[]> {
    const results: FeedItem[] = []
    await Promise.all(this.endpoints.map(async endpoint => {
      const res = await fetch(endpoint)
      const data = (await res.json()) as any[]
      data.forEach(item => {
        results.push({
          id: item.id.toString(),
          title: item.title,
          url: item.link,
          publishedAt: new Date(item.published_at || item.pubDate).getTime()
        })
      })
    }))
    return results
  }
}
