
import { TransferBridgeApi, BridgeTransferParams, BridgeTransferReceipt } from './transferBridgeApi'
import EventEmitter from 'events'

export class TransferBridgeService extends EventEmitter {
  private api: TransferBridgeApi

  constructor(rpcUrl: string) {
    super()
    this.api = new TransferBridgeApi(rpcUrl)
  }

  async executeBridge(params: BridgeTransferParams): Promise<BridgeTransferReceipt> {
    this.emit('start', params)
    try {
      const tx = await this.api.createBridgeTransaction(params)
      const receipt = await this.api.sendBridgeTransaction(tx)
      this.emit('success', receipt)
      return receipt
    } catch (err: any) {
      this.emit('error', err.message)
      throw err
    }
  }

  onStart(listener: (params: BridgeTransferParams) => void): void {
    this.on('start', listener)
  }

  onSuccess(listener: (receipt: BridgeTransferReceipt) => void): void {
    this.on('success', listener)
  }

  onError(listener: (error: string) => void): void {
    this.on('error', listener)
  }
}
