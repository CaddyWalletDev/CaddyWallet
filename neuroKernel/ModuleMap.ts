export interface ModuleDefinition {
  name: string
  version: string
  dependencies: string[]
  initialize: () => Promise<void>
}

export class CoreModuleMap {
  private modules: Map<string, ModuleDefinition> = new Map()

  register(module: ModuleDefinition): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module already registered: ${module.name}`)
    }
    this.modules.set(module.name, module)
  }

  unregister(name: string): void {
    if (!this.modules.has(name)) {
      throw new Error(`Module not found: ${name}`)
    }
    this.modules.delete(name)
  }

  async initializeAll(): Promise<void> {
    const initialized: Set<string> = new Set()
    for (const module of this.modules.values()) {
      await this.initializeModule(module.name, initialized)
    }
  }

  private async initializeModule(name: string, initialized: Set<string>): Promise<void> {
    if (initialized.has(name)) return
    const module = this.modules.get(name)
    if (!module) {
      throw new Error(`Module definition missing: ${name}`)
    }
    for (const dep of module.dependencies) {
      await this.initializeModule(dep, initialized)
    }
    await module.initialize()
    initialized.add(name)
  }

  list(): string[] {
    return Array.from(this.modules.keys())
  }
}
