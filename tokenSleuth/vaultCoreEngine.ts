// VaultEngine.ts

import { Wallet, WalletData, Coinbase } from "@sol/sol-sdk"
import { z } from "zod"
import { CdpAction, CdpActionResult, CdpActionSchemaAny } from "./actions/cdp-action"

/**
 * Configuration for VaultEngine
 */
const VaultEngineConfigSchema = z.object({
  apiKeyName: z.string().nonempty(),
  apiKeyPrivate: z.string().nonempty(),
  clientSource: z.string().default("vault-engine"),
  versionTag: z.string().optional(),
})

export type VaultEngineConfig = z.infer<typeof VaultEngineConfigSchema>

const VaultEngineWithWalletSchema = VaultEngineConfigSchema.extend({
  networkId: z.string().optional(),
  walletPayload: z.string().optional(),
})

export type VaultEngineWithWallet = z.infer<typeof VaultEngineWithWalletSchema>

export class VaultEngine {
  private identity?: Wallet
  private readonly cfg: VaultEngineConfig

  private constructor(cfg: VaultEngineConfig) {
    this.cfg = cfg

    Coinbase.configure({
      apiKeyName: cfg.apiKeyName,
      privateKey: cfg.apiKeyPrivate.replace(/\r?\n/g, ""),
      source: cfg.clientSource,
      versionTag: cfg.versionTag,
    })
  }

  /**
   * Initialize engine without wallet (for read-only or static calls)
   */
  public static create(config: unknown): VaultEngine {
    const parsed = VaultEngineConfigSchema.parse({
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivate: process.env.CDP_API_KEY_PRIVATE_KEY,
      ...config,
    })
    return new VaultEngine(parsed)
  }

  /**
   * Initialize engine and import or create a wallet
   */
  public static async initWithWallet(config: unknown): Promise<VaultEngine> {
    const parsed = VaultEngineWithWalletSchema.parse({
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivate: process.env.CDP_API_KEY_PRIVATE_KEY,
      ...config,
    })
    const engine = new VaultEngine(parsed)

    const networkId =
      parsed.networkId ||
      process.env.NETWORK_ID ||
      Coinbase.networks.BaseSepolia

    engine.identity = parsed.walletPayload
      ? await Wallet.import(JSON.parse(parsed.walletPayload) as WalletData)
      : await Wallet.create({ networkId })

    return engine
  }

  /**
   * Execute a CDP action. If action requires wallet, identity must be initialized.
   */
  public async execute<T extends CdpActionSchemaAny, R>(
    action: CdpAction<T, R>,
    input: z.infer<T>
  ): Promise<CdpActionResult<R>> {
    if (!action.func) {
      return { message: `No execution function for action: ${action.name}` }
    }

    try {
      // walletless actions
      if (action.func.length === 1) {
        return await (action.func as (i: z.infer<T>) => Promise<CdpActionResult<R>>)(input)
      }
      // wallet actions
      if (!this.identity) {
        return { message: `Wallet not initialized for action: ${action.name}` }
      }
      return await (action.func as (w: Wallet, i: z.infer<T>) => Promise<CdpActionResult<R>>)(
        this.identity,
        input
      )
    } catch (err: any) {
      return { message: `Action "${action.name}" failed: ${err.message}` }
    }
  }

  /**
   * Export the wallet as a JSON payload.
   */
  public async dumpWallet(): Promise<string> {
    if (!this.identity) {
      throw new Error("Wallet is not initialized")
    }
    const exported = this.identity.export()
    const defaultAddressId = (await this.identity.getDefaultAddress()).getId()
    return JSON.stringify({ ...exported, defaultAddressId })
  }
}
