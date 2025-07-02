import { WalletSyncService } from './walletSyncService'
import { PublicKey } from '@solana/web3.js'

export interface WalletNotification {
  address: string
  event: string
  payload: any
}

export class WalletNotifier {
  private sync: WalletSyncService
  private listeners: Array<(note: WalletNotification) => void> = []

  constructor(rpcUrl: string) {
    this.sync = new WalletSyncService(rpcUrl)
    this.sync.on('transaction', ({ address, transaction }) => {
      const success = transaction.meta?.err == null
      const event = success ? 'txSuccess' : 'txFailure'
      const payload = { signature: transaction.transaction.signatures[0], err: transaction.meta?.err }
      this.notify({ address, event, payload })
    })
  }

  subscribe(callback: (note: WalletNotification) => void): void {
    this.listeners.push(callback)
  }

  notify(note: WalletNotification): void {
    this.listeners.forEach(l => l(note))
  }

  trackAddress(address: string): void {
    this.sync.track(address)
  }

  start(intervalMs: number): void {
    this.sync.start(intervalMs)
  }
}
