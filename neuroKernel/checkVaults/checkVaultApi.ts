export interface VaultStatus {
  vaultId: string
  collateral: number
  debt: number
  collateralRatio: number
  healthy: boolean
  timestamp: number
}

export class CheckVaultApi {
  constructor(private rpcUrl: string) {}

  private async fetchRawState(vaultId: string): Promise<{ collateral: number; debt: number }> {
    // placeholder: fetch on-chain vault account data
    // return { collateral: <lamports>, debt: <lamports> }
    return { collateral: 0, debt: 0 }
  }

  async getVaultStatus(vaultId: string): Promise<VaultStatus> {
    const raw = await this.fetchRawState(vaultId)
    const ratio = raw.debt > 0 ? (raw.collateral / raw.debt) * 100 : Infinity
    const healthy = ratio >= 150
    return {
      vaultId,
      collateral: raw.collateral,
      debt: raw.debt,
      collateralRatio: ratio,
      healthy,
      timestamp: Date.now()
    }
  }
}
