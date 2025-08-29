import pLimit from "p-limit"
import {
  Connection,
  PublicKey,
  Commitment,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from "@solana/web3.js"

export interface LedgerEntry {
  signature: string
  slot: number
  timestamp: number
  preBalance: number
  postBalance: number
}

export interface FetchSignaturesOptions {
  /** Max signatures to return (default 100) */
  limit?: number
  /** Fetch signatures strictly before this signature (pagination) */
  before?: string
  /** Fetch signatures down to and including this signature (pagination) */
  until?: string
  /** Commitment level (default "confirmed") */
  commitment?: Commitment
}

export interface FetchEntriesOptions {
  /** Max concurrent RPC calls when fetching transactions (default 6) */
  concurrency?: number
  /** Commitment level for transaction fetch (default "confirmed") */
  commitment?: Commitment
}

export class LedgerScopeApi {
  private connection: Connection

  constructor(rpcUrl: string, commitment: Commitment = "confirmed") {
    this.connection = new Connection(rpcUrl, commitment)
  }

  /**
   * Fetch a page of signatures for an address, with optional pagination.
   */
  async fetchSignatures(address: string, opts: FetchSignaturesOptions = {}): Promise<string[]> {
    const pub = this.toPublicKey(address)
    const {
      limit = 100,
      before,
      until,
      commitment = "confirmed",
    } = opts

    const sigs: ConfirmedSignatureInfo[] = await this.connection.getSignaturesForAddress(
      pub,
      { limit, before, until },
      commitment
    )
    return sigs.map(s => s.signature)
  }

  /**
   * Convenience: page through signatures until `total` are collected (or no more available).
   */
  async fetchSignaturesPaged(
    address: string,
    total: number,
    pageSize = 100,
    commitment: Commitment = "confirmed"
  ): Promise<string[]> {
    const pub = this.toPublicKey(address)
    const out: string[] = []
    let before: string | undefined = undefined

    while (out.length < total) {
      const batch = await this.connection.getSignaturesForAddress(
        pub,
        { limit: Math.min(pageSize, total - out.length), before },
        commitment
      )
      if (batch.length === 0) break
      out.push(...batch.map(s => s.signature))
      before = batch[batch.length - 1].signature
      if (batch.length < Math.min(pageSize, total - (out.length - batch.length))) break
    }

    return out
  }

  /**
   * Fetch ledger entries (pre/post SOL balance) for the given address and signatures.
   * Uses concurrency with backpressure and robust key normalization.
   */
  async fetchLedgerEntries(
    address: string,
    signatures: string[],
    opts: FetchEntriesOptions = {}
  ): Promise<LedgerEntry[]> {
    if (signatures.length === 0) return []

    const pub = this.toPublicKey(address)
    const addr58 = pub.toBase58()
    const { concurrency = 6, commitment = "confirmed" } = opts
    const limit = pLimit(Math.max(1, concurrency))

    const entries: LedgerEntry[] = []

    await Promise.all(
      signatures.map(sig =>
        limit(async () => {
          try {
            const tx = (await this.connection.getParsedTransaction(sig, {
              commitment,
              maxSupportedTransactionVersion: 0,
            })) as ParsedTransactionWithMeta | null
            if (!tx?.meta) return

            const keys = normalizeAccountKeys(tx.transaction.message.accountKeys)
            const idx = keys.indexOf(addr58)
            if (idx === -1) return

            const pre = tx.meta.preBalances[idx]
            const post = tx.meta.postBalances[idx]

            entries.push({
              signature: sig,
              slot: tx.slot,
              timestamp: (tx.blockTime ?? 0) * 1000,
              preBalance: pre,
              postBalance: post,
            })
          } catch (err: any) {
            // Soft-fail per signature
            // eslint-disable-next-line no-console
            console.warn(`[LedgerScopeApi] Failed to process ${sig}: ${err?.message ?? err}`)
          }
        })
      )
    )

    // Return sorted by slot asc, then by signature to stabilize order
    return entries.sort((a, b) => (a.slot - b.slot) || a.signature.localeCompare(b.signature))
  }

  /**
   * One-shot helper: fetch latest N signatures then resolve their ledger entries.
   */
  async fetchLatestEntries(
    address: string,
    total = 100,
    opts: FetchEntriesOptions & { pageSize?: number } = {}
  ): Promise<LedgerEntry[]> {
    const sigs = await this.fetchSignaturesPaged(address, total, opts.pageSize ?? 100, opts.commitment ?? "confirmed")
    return this.fetchLedgerEntries(address, sigs, opts)
  }

  // ---- internals ----

  private toPublicKey(address: string): PublicKey {
    try {
      return new PublicKey(address)
    } catch {
      throw new Error(`Invalid address: ${address}`)
    }
  }
}

/** Normalize accountKeys to base58 strings across web3.js shapes */
function normalizeAccountKeys(
  keys: Array<string | PublicKey | { pubkey: PublicKey } | { pubkey: { toBase58(): string } }>
): string[] {
  return keys.map((k: any) => {
    if (typeof k === "string") return k
    const pk: PublicKey | undefined = k?.pubkey ?? k
    if (pk && typeof (pk as any).toBase58 === "function") return (pk as any).toBase58()
    if (pk && typeof (pk as any).toString === "string") return String(pk)
    // Fallback: try common field shapes
    try {
      return pk?.toString?.() ?? pk?.toBase58?.() ?? ""
    } catch {
      return ""
    }
  })
}
