describe('WalletSyncService', () => {
  let sync: WalletSyncService
  beforeEach(() => {
    sync = new WalletSyncService('http://localhost')
  })

  it('emits transaction event when new signature appears', async () => {
    const handler = jest.fn()
    sync.on('transaction', handler)
    await sync.track('TestAddress')
    await new Promise(process.nextTick)
    expect(handler).toHaveBeenCalled()
    const [payload] = handler.mock.calls[0]
    expect(payload.address).toBe('TestAddress')
    expect(payload.transaction.transaction.signatures[0]).toBe('sig1')
  })
})

describe('WalletNotifier', () => {
  let notifier: WalletNotifier
  beforeEach(() => {
    notifier = new WalletNotifier('http://localhost')
  })

  it('notifies subscribers on successful transaction', async () => {
    const notes: any[] = []
    notifier.subscribe(note => notes.push(note))
    notifier.trackAddress('TestAddress')
    notifier.start(50)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(notes.length).toBeGreaterThan(0)
    const note = notes[0]
    expect(note.address).toBe('TestAddress')
    expect(note.event).toBe('txSuccess')
    expect(note.payload.signature).toBe('sig1')
  })
})
