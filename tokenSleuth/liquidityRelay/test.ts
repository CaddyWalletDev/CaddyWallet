import { WalletSyncService } from '../services/WalletSyncService'
import { WalletNotifier } from '../services/WalletNotifier'

// Optional: mock solana/web3.js or your RPC transport if needed

describe('Wallet Tracking & Notification Suite', () => {
  let sync: WalletSyncService
  let notifier: WalletNotifier

  beforeEach(() => {
    sync = new WalletSyncService('http://localhost')
    notifier = new WalletNotifier('http://localhost')
  })

  it('WalletSyncService emits transaction event when new signature appears', async () => {
    const handler = jest.fn()

    sync.on('transaction', handler)

    // Act: track address
    await sync.track('TestAddress')

    // Wait for event loop (simulate async event emission)
    await new Promise(process.nextTick)

    expect(handler).toHaveBeenCalled()

    const [payload] = handler.mock.calls[0]

    expect(payload.address).toBe('TestAddress')
    expect(payload.transaction.transaction.signatures[0]).toBe('sig1')
  })

  it('WalletNotifier notifies subscribers on successful transaction', async () => {
    const received: any[] = []

    // Set up subscription
    notifier.subscribe(note => {
      received.push(note)
    })

    notifier.trackAddress('TestAddress')
    notifier.start(25) // Start polling every 25ms

    // Wait until note is pushed
    await new Promise<void>((resolve) => {
      const check = () => {
        if (received.length > 0) {
          return resolve()
        }
        setTimeout(check, 10)
      }
      check()
    })

    const note = received[0]

    expect(note.address).toBe('TestAddress')
    expect(note.event).toBe('txSuccess')
    expect(note.payload.signature).toBe('sig1')
  })
})
