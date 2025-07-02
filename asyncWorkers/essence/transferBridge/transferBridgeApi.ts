
import { Connection, PublicKey, Transaction } from '@solana/web3.js'

export interface BridgeTransferParams {
  sourceMint: string
  targetChain: string
  amount: number
  userAddress: string
}

export interface BridgeTransferReceipt {
  signature: string
  slot: number
  status: 'pending' | 'success' | 'failed'
}

export class TransferBridgeApi {
  private connection: Connection

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  async createBridgeTransaction(params: BridgeTransferParams): Promise<Transaction> {
    const tx = new Transaction()
    const source = new PublicKey(params.sourceMint)
    const dest = new PublicKey(params.userAddress)
    // placeholder instruction: wrap transfer + memo for cross-chain
    tx.add({
      keys: [
        { pubkey: dest, isSigner: false, isWritable: true }
      ],
      programId: source,
      data: Buffer.from(JSON.stringify({
        targetChain: params.targetChain,
        amount: params.amount
      }))
    })
    return tx
  }

  async sendBridgeTransaction(tx: Transaction): Promise<BridgeTransferReceipt> {
    const sig = await this.connection.sendTransaction(tx, [])
    await this.connection.confirmTransaction(sig, 'finalized')
    return { signature: sig, slot: (await this.connection.getSlot()), status: 'success' }
  }
}
