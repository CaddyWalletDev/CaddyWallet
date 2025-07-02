type VaultAlert = {
  vaultId: string
  issue: 'undercollateralized' | 'normal'
  ratio: number
  timestamp: number
}

export class CheckVaultService {
  private api = new CheckVaultApi(this.rpcUrl)
  private watchers: Map<string, NodeJS.Timeout> = new Map()

  constructor(private rpcUrl: string, private intervalMs: number = 30000) {}

  watchVault(
    vaultId: string,
    onAlert: (alert: VaultAlert) => void
  ): void {
    if (this.watchers.has(vaultId)) return
    const tick = async () => {
      const status = await this.api.getVaultStatus(vaultId)
      const issue = status.healthy ? 'normal' : 'undercollateralized'
      onAlert({ vaultId, issue, ratio: status.collateralRatio, timestamp: status.timestamp })
    }
    tick()
    const timer = setInterval(tick, this.intervalMs)
    this.watchers.set(vaultId, timer)
  }

  unwatchVault(vaultId: string): void {
    const timer = this.watchers.get(vaultId)
    if (timer) {
      clearInterval(timer)
      this.watchers.delete(vaultId)
    }
  }

  async checkAll(vaultIds: string[]): Promise<VaultStatus[]> {
    const statuses = await Promise.all(vaultIds.map(id => this.api.getVaultStatus(id)))
    return statuses
  }
}
