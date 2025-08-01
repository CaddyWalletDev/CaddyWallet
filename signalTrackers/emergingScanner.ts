import pLimit from "p-limit"
import {
  Connection,
  PublicKey,
  ConfirmedSignatureInfo,
} from "@solana/web3.js"

export interface EmergenceRates {
  [address: string]: number
}

export interface EmergingScannerOptions {
  /** How far back to scan (ms) */
  windowMs?: number
  /** Min tx count in window to flag emerging */
  threshold?: number
  /** Parallel RPC calls */
  concurrency?: number
  /** Max signatures to fetch per address */
  signatureLimit?: number
}

/**
 * Scans Solana accounts for “emerging” activity.
 */
export class EmergingScanner {
  private conn: Connection
  private windowMs: number
  private threshold: number
  private limit: number
  private concurrency: number

  constructor(rpcUrl: string, opts: EmergingScannerOptions = {}) {
    if (!rpcUrl) throw new Error("RPC URL is required")
    this.conn = new Connection(rpcUrl, "confirmed")
    this.windowMs = opts.windowMs != null ? opts.windowMs : 60_000
    this.threshold = opts.threshold != null ? opts.threshold : 100
    this.concurrency = opts.concurrency != null ? opts.concurrency : 5
    this.limit = opts.signatureLimit != null ? opts.signatureLimit : 100

    if (this.windowMs <= 0) {
      throw new RangeError(`windowMs must be positive, got ${this.windowMs}`)
    }
    if (this.threshold < 0) {
      throw new RangeError(`threshold must be non-negative, got ${this.threshold}`)
    }
    if (this.concurrency < 1) {
      throw new RangeError(`concurrency must be >= 1, got ${this.concurrency}`)
    }
    if (this.limit < 1) {
      throw new RangeError(`signatureLimit must be >= 1, got ${this.limit}`)
    }
  }

  private async fetchRecentSignatures(
    addr: string,
    sigLimit: number,
  ): Promise<ConfirmedSignatureInfo[]> {
    try {
      return await this.conn.getSignaturesForAddress(
        new PublicKey(addr),
        { limit: sigLimit },
      )
    } catch (err: any) {
      console.warn(`Failed to fetch signatures for ${addr}: ${err.message}`)
      return []
    }
  }

  /**
   * Returns addresses with ≥ threshold txs in the time window.
   */
  public async scan(addresses: string[]): Promise<string[]> {
    const now = Date.now()
    const emerging = new Set<string>()
    const limiter = pLimit(this.concurrency)

    await Promise.all(
      addresses.map(addr =>
        limiter(async () => {
          const sigs = await this.fetchRecentSignatures(addr, this.limit)
          const count = sigs.reduce((acc, s) => {
            const ts = (s.blockTime ?? 0) * 1000
            return acc + (now - ts <= this.windowMs ? 1 : 0)
          }, 0)
          if (count >= this.threshold) {
            emerging.add(addr)
          }
        }),
      ),
    )

    return Array.from(emerging)
  }

  /**
   * Computes txs-per-second for each address over the window.
   */
  public async getEmergenceRates(
    addresses: string[],
  ): Promise<EmergenceRates> {
    const now = Date.now()
    const rates: EmergenceRates = {}
    const limiter = pLimit(this.concurrency)

    await Promise.all(
      addresses.map(addr =>
        limiter(async () => {
          const sigs = await this.fetchRecentSignatures(addr, this.limit)
          const count = sigs.reduce((acc, s) => {
            const ts = (s.blockTime ?? 0) * 1000
            return acc + (now - ts <= this.windowMs ? 1 : 0)
          }, 0)
          rates[addr] = count / (this.windowMs / 1000)
        }),
      ),
    )

    return rates
  }
}
