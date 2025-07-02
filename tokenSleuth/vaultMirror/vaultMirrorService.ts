import { Connection, PublicKey } from '@solana/web3.js'

export interface VaultState {
  vaultAddress: PublicKey
  totalAssets: number
  assetMint: PublicKey
  lastUpdated: number
}

export class VaultMirrorService {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  async fetchVaultState(vaultAddress: string): Promise<VaultState> {
    const vault = new PublicKey(vaultAddress)
    const account = await this.connection.getParsedAccountInfo(vault)
    const data: any = (account.value?.data as any).parsed.info
    return {
      vaultAddress: vault,
      totalAssets: Number(data.amount),
      assetMint: new PublicKey(data.mint),
      lastUpdated: Date.now()
    }
  }

  async mirrorVault(vaultAddress: string, targetProgramId: string): Promise<string> {
    const state = await this.fetchVaultState(vaultAddress)
    const program = new PublicKey(targetProgramId)
    const payload = Buffer.from(JSON.stringify({
      vault: state.vaultAddress.toBase58(),
      total: state.totalAssets,
      mint: state.assetMint.toBase58(),
      updated: state.lastUpdated
    }))
    return await this.connection.sendRawTransaction(payload)
  }

  async listRecentVaults(addresses: string[], limit: number = 10): Promise<VaultState[]> {
    const result: VaultState[] = []
    for (const addr of addresses.slice(0, limit)) {
      result.push(await this.fetchVaultState(addr))
    }
    return result
  }
}
