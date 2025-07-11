/**
 * Definition of a pluggable module with dependencies and initialization logic.
 */
export interface ModuleDefinition {
  /** Unique module name */
  readonly name: string
  /** Semantic version string */
  readonly version: string
  /** Names of other modules that must initialize before this one */
  readonly dependencies: readonly string[]
  /** Async initializer called once dependencies are ready */
  initialize: () => Promise<void>
}

/**
 * Manages registration and initialization of core modules with dependency resolution.
 */
export class CoreModuleMap {
  private readonly modules = new Map<string, ModuleDefinition>()

  /**
   * Register a new module. Throws if already registered.
   */
  public register(module: ModuleDefinition): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module already registered: ${module.name}`)
    }
    this.modules.set(module.name, module)
  }

  /**
   * Unregister an existing module. Throws if not found.
   */
  public unregister(name: string): void {
    if (!this.modules.delete(name)) {
      throw new Error(`Module not found: ${name}`)
    }
  }

  /**
   * Returns the list of registered module names.
   */
  public list(): string[] {
    return [...this.modules.keys()]
  }

  /**
   * Initialize all modules in correct dependency order.
   * Detects circular dependencies and throws on missing references.
   */
  public async initializeAll(): Promise<void> {
    const visited = new Set<string>()
    const inProgress = new Set<string>()

    for (const name of this.modules.keys()) {
      await this.initializeModule(name, visited, inProgress)
    }
  }

  /**
   * Recursively initialize a module and its dependencies.
   */
  private async initializeModule(
    name: string,
    visited: Set<string>,
    inProgress: Set<string>
  ): Promise<void> {
    if (visited.has(name)) return
    if (inProgress.has(name)) {
      throw new Error(`Circular dependency detected on module: ${name}`)
    }

    const module = this.modules.get(name)
    if (!module) {
      throw new Error(`Module definition missing: ${name}`)
    }

    inProgress.add(name)
    for (const dep of module.dependencies) {
      await this.initializeModule(dep, visited, inProgress)
    }
    inProgress.delete(name)

    try {
      await module.initialize()
    } catch (err: any) {
      throw new Error(`Failed to initialize module ${name}: ${err.message}`)
    }

    visited.add(name)
  }
}
