export interface DealSignal {
  asset: string
  score: number
  timestamp: number
}

export interface DealRoute {
  asset: string
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  executedAt?: number
}

export interface RoutingConfig {
  buyThreshold: number
  sellThreshold: number
  holdRange: [number, number]
  maxRoutesPerInterval: number
}

export class RouteDeals {
  private config: RoutingConfig
  private history: DealRoute[] = []
  private intervalStart: number = Date.now()
  private routesThisInterval: number = 0

  constructor(config?: Partial<RoutingConfig>) {
    this.config = {
      buyThreshold: 70,
      sellThreshold: 30,
      holdRange: [30, 70],
      maxRoutesPerInterval: 10,
      ...config
    }
  }

  private resetInterval(): void {
    const now = Date.now()
    if (now - this.intervalStart >= 60_000) {
      this.intervalStart = now
      this.routesThisInterval = 0
    }
  }

  private decideAction(score: number): 'buy' | 'sell' | 'hold' {
    if (score >= this.config.buyThreshold) return 'buy'
    if (score <= this.config.sellThreshold) return 'sell'
    return 'hold'
  }

  private computeConfidence(score: number): number {
    const { buyThreshold, sellThreshold } = this.config
    if (score >= buyThreshold) {
      return Math.min(1, (score - buyThreshold) / (100 - buyThreshold))
    }
    if (score <= sellThreshold) {
      return Math.min(1, (sellThreshold - score) / sellThreshold)
    }
    const [low, high] = this.config.holdRange
    return 1 - Math.abs((score - (low + high) / 2) / ((high - low) / 2))
  }

  route(signals: DealSignal[]): DealRoute[] {
    this.resetInterval()
    const routes: DealRoute[] = []

    for (const sig of signals) {
      if (this.routesThisInterval >= this.config.maxRoutesPerInterval) break

      const action = this.decideAction(sig.score)
      const confidence = this.computeConfidence(sig.score)

      const route: DealRoute = {
        asset: sig.asset,
        action,
        confidence
      }
      routes.push(route)
      this.history.push(route)
      this.routesThisInterval++
    }

    return routes
  }

  getHistory(limit: number = 50): DealRoute[] {
    return this.history.slice(-limit)
  }

  pruneHistory(olderThanMs: number): void {
    const cutoff = Date.now() - olderThanMs
    this.history = this.history.filter(r => (r.executedAt || 0) >= cutoff)
  }
}
