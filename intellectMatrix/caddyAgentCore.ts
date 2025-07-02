export type PluginFn = (context: ActionContext) => Promise<void>

export class CaddyAgentCore {
  private actions = new Map<string, BaseCaddyAction>()
  private plugins: PluginFn[] = []

  register(name: string, action: BaseCaddyAction): void {
    this.actions.set(name, action)
  }

  use(plugin: PluginFn): void {
    this.plugins.push(plugin)
  }

  async invoke(name: string, context: ActionContext): Promise<any> {
    const action = this.actions.get(name)
    if (!action) {
      throw new Error(`Action not found: ${name}`)
    }
    for (const plugin of this.plugins) {
      await plugin(context)
    }
    return action.run(context)
  }
}
