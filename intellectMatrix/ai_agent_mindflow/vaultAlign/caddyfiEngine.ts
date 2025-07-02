import fetch from 'node-fetch'

export interface OnChainMetric {
  timestamp: number
  volume: number
  liquidity: number
  activeAddresses: number
}

export class CaddyfiEngine {
  private apiUrl: string
  private apiKey: string
  private maxRetries: number = 3
  private retryDelayMs: number = 500

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl
    this.apiKey = apiKey
  }

  private async request(endpoint: string): Promise<any> {
    let attempt = 0
    while (attempt <= this.maxRetries) {
      try {
        const res = await fetch(`${this.apiUrl}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return await res.json()
      } catch (err) {
        attempt++
        if (attempt > this.maxRetries) {
          throw err
        }
        await new Promise(r => setTimeout(r, this.retryDelayMs * attempt))
      }
    }
  }

  async fetchMetrics(
    contractAddress: string,
    periodHours: number
  ): Promise<OnChainMetric[]> {
    const endpoint = `/metrics?contract=${contractAddress}&hours=${periodHours}`
    const data = await this.request(endpoint)
    if (!Array.isArray(data)) {
      throw new Error('Invalid metrics format')
    }
    return data.map((item: any) => ({
      timestamp: Number(item.timestamp),
      volume: Number(item.volume),
      liquidity: Number(item.liquidity),
      activeAddresses: Number(item.activeAddresses)
    }))
  }
}
