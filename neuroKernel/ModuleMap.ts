/**
 * Definition of a pluggable module with dependencies and initialization logic.
 */
export interface ModuleDefinition {
  /** Unique module name */
  readonly name: string
  /** Semantic version string (must satisfy semver) */
  readonly version: string
  /** Names of other modules that must initialize before this one */
  readonly dependencies: readonly string[]
  /** Async initializer called once dependencies are ready */
  initialize: () => Promise<void>
}

/**
 * Optional callbacks for lifecycle events
 */
export interface CoreModuleMapOptions {
  /** Called when a module is registered */
  onRegistered?: (mod: ModuleDefinition) => void
  /** Called before a module is initialized */
  onBeforeInit?: (mod: ModuleDefinition) => void
  /** Called after successful initialization */
  onAfterInit?: (mod: ModuleDefinition, durationMs: number) => void
  /** Called on initialization error */
  onInitError?: (mod: ModuleDefinition, error: Error) => void
}

/**
 * Manages registration and initialization of core modules
 * with dependency resolution, semver checks, and hooks.
 */
export class CoreModuleMap {
  private readonly modules = new Map<string, ModuleDefinition>()
  private readonly options: Required<CoreModuleMapOptions>

  constructor(options?: CoreModuleMapOptions) {
    this.options = {
      onRegistered: options?.onRegistered ?? (() => {}),
      onBeforeInit: options?.onBeforeInit ?? (() => {}),
      onAfterInit: options?.onAfterInit ?? (() => {}),
      onInitError: options?.onInitError ?? (() => {}),
    }
  }

  /**
   * Register a new module. Throws if name duplicate or invalid semver.
   */
  public register(module: ModuleDefinition): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module already registered: ${module.name}`)
    }
    if (!this.isValidSemver(module.version)) {
      throw new Error(`Invalid semver version for module ${module.name}: ${module.version}`)
    }
    this.modules.set(module.name, module)
    this.log('info', `Registered module ${module.name}@${module.version}`)
    this.options.onRegistered(module)
  }

  /**
   * Unregister an existing module. Throws if not found.
   */
  public unregister(name: string): void {
    if (!this.modules.delete(name)) {
      throw new Error(`Module not found: ${name}`)
    }
    this.log('info', `Unregistered module ${name}`)
  }

  /**
   * Returns the list of registered module names.
   */
  public list(): string[] {
    return [...this.modules.keys()]
  }

  /**
   * Initialize all modules in correct dependency order.
   * Uses Kahn's algorithm for topological sort to detect cycles
   * and allows parallel init of independent modules.
   */
  public async initializeAll(): Promise<void> {
    const inDegree = new Map<string, number>()
    const dependents = new Map<string, Set<string>>()

    // build graph
    for (const [name, mod] of this.modules) {
      inDegree.set(name, 0)
      dependents.set(name, new Set())
    }
    for (const [name, mod] of this.modules) {
      for (const dep of mod.dependencies) {
        if (!this.modules.has(dep)) {
          throw new Error(`Missing dependency: ${name} depends on ${dep}`)
        }
        inDegree.set(name, inDegree.get(name)! + 1)
        dependents.get(dep)!.add(name)
      }
    }

    // queue of modules with no incoming edges
    const ready = Array.from(inDegree.entries())
      .filter(([, deg]) => deg === 0)
      .map(([name]) => this.modules.get(name)!)

    const initialized = new Set<string>()

    while (ready.length > 0) {
      // initialize all ready modules in parallel
      const batch = ready.splice(0)
      await Promise.all(batch.map(async (mod) => {
        this.options.onBeforeInit(mod)
        this.log('info', `Initializing ${mod.name}`)
        const start = Date.now()
        try {
          await mod.initialize()
          const duration = Date.now() - start
          initialized.add(mod.name)
          this.log('info', `Initialized ${mod.name} in ${duration}ms`)
          this.options.onAfterInit(mod, duration)
        } catch (err: any) {
          this.log('error', `Error initializing ${mod.name}: ${err.message}`)
          this.options.onInitError(mod, err)
          throw new Error(`Initialization failed for ${mod.name}: ${err.message}`)
        }
      }))

      // decrement in-degree of dependents
      for (const mod of batch) {
        for (const depName of dependents.get(mod.name)!) {
          inDegree.set(depName, inDegree.get(depName)! - 1)
          if (inDegree.get(depName) === 0) {
            ready.push(this.modules.get(depName)!)
          }
        }
      }
    }

    // if not all initialized, there's a cycle
    if (initialized.size !== this.modules.size) {
      const remaining = [...this.modules.keys()].filter(n => !initialized.has(n))
      throw new Error(`Circular dependency detected among: ${remaining.join(', ')}`)
    }
  }

  /**
   * Basic semver validation (major.minor.patch)
   */
  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/.test(version)
  }

  /**
   * Structured logging.
   */
  private log(level: 'info' | 'error', message: string, meta?: unknown): void {
    console[level](
      `[CoreModuleMap] ${new Date().toISOString()} ${message}`,
      meta ?? ''
    )
  }
}
