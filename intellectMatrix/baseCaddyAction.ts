export interface ActionContext {
  payload: any
  metadata: { origin: string; timestamp: number }
}

export abstract class BaseCaddyAction {
  abstract execute(context: ActionContext): Promise<any>

  protected validate(context: ActionContext): void {
    if (context.payload == null) {
      throw new Error('Missing payload')
    }
    if (!context.metadata || typeof context.metadata.timestamp !== 'number') {
      throw new Error('Invalid metadata')
    }
  }

  async run(context: ActionContext): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      this.validate(context)
      const result = await this.execute(context)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }
}
