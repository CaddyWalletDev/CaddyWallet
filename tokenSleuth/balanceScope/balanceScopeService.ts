export interface BalanceScopeConfig {
  includeNative: boolean
  mintWhitelist?: string[]
}

export interface BalanceScopeSummary {
  totalNative: number
  totalTokens: Record<string, number>
  perAddress: Record<string, { native: number; tokens: Record<string, number> }>
}

export class BalanceScopeService {
  constructor(private api: BalanceScopeApi, private config: BalanceScopeConfig = { includeNative: true }) {}

  async summarize(addresses: string[]): Promise<BalanceScopeSummary> {
    const summary: BalanceScopeSummary = {
      totalNative: 0,
      totalTokens: {},
      perAddress: {}
    }

    if (this.config.includeNative) {
      const natives = await this.api.getNativeBalances(addresses)
      for (const { address, lamports } of natives) {
        summary.totalNative += lamports
        summary.perAddress[address] = { native: lamports, tokens: {} }
      }
    } else {
      addresses.forEach(addr => {
        summary.perAddress[addr] = { native: 0, tokens: {} }
      })
    }

    const mintFilter = this.config.mintWhitelist?.length ? undefined : undefined
    const balances = await this.api.getMultipleBalances(addresses, mintFilter as any)
    for (const bal of balances) {
      if (this.config.mintWhitelist && !this.config.mintWhitelist.includes(bal.mint)) continue
      summary.totalTokens[bal.mint] = (summary.totalTokens[bal.mint] || 0) + bal.amount
      const entry = summary.perAddress[bal.address]
      entry.tokens[bal.mint] = (entry.tokens[bal.mint] || 0) + bal.amount
    }

    return summary
  }

  async detectDust(addresses: string[], dustThreshold: number): Promise<Array<{ address: string; mint: string; amount: number }>> {
    const dust: Array<{ address: string; mint: string; amount: number }> = []
    const balances = await this.api.getMultipleBalances(addresses)
    for (const bal of balances) {
      if (bal.amount <= dustThreshold) {
        dust.push(bal)
      }
    }
    return dust
  }
}
