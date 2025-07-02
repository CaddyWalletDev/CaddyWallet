export interface VaultOperation {
  name: string
  execute: () => Promise<ActionResult>
  dependencies?: string[]
}

export interface EngineOptions {
  maxConcurrent: number
  retryLimit: number
}

export class VaultOpsEngine {
  private queue: VaultOperation[] = []
  private running: number = 0

  constructor(private opts: EngineOptions = { maxConcurrent: 2, retryLimit: 3 }) {}

  enqueue(op: VaultOperation): void {
    this.queue.push(op)
  }

  async start(): Promise<void> {
    while (this.queue.length) {
      if (this.running < this.opts.maxConcurrent) {
        const op = this.queue.shift()!
        this.runOperation(op)
      } else {
        await this.sleep(100)
      }
    }
    await this.waitForIdle()
  }

  private async runOperation(op: VaultOperation): Promise<void> {
    this.running++
    let attempts = 0
    let result: ActionResult = { success: false, message: '' }
    while (attempts <= this.opts.retryLimit && !result.success) {
      attempts++
      result = await op.execute()
      if (!result.success && attempts <= this.opts.retryLimit) {
        await this.sleep(200 * attempts)
      }
    }
    if (!result.success) {
      console.error(`Operation failed: ${op.name} after ${attempts} attempts`)
    }
    this.running--
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private waitForIdle(): Promise<void> {
    return new Promise(resolve => {
      const check = () => {
        if (this.running === 0) resolve()
        else setTimeout(check, 100)
      }
      check()
    })
  }
}
