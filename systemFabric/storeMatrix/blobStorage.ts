export interface StorageOptions {
  retryOptions?: { maxTries: number; retryDelayInMs: number }
  defaultContainer: string
}

export class BlobStorage {
  private client: BlobClient
  private ensurer: ContainerEnsurer

  constructor(private options: StorageOptions, private credential: any) {
    this.client = new BlobClient(options.defaultContainer, credential)
    this.ensurer = new ContainerEnsurer(options.defaultContainer, credential)
  }

  async initialize(): Promise<void> {
    await this.ensurer.ensure(this.options.defaultContainer)
  }

  async save(key: string, data: Uint8Array): Promise<void> {
    await this.client.uploadBlob(this.options.defaultContainer, key, data)
  }

  async load(key: string): Promise<Uint8Array> {
    return this.client.downloadBlob(this.options.defaultContainer, key)
  }

  async remove(key: string): Promise<void> {
    await this.client.deleteBlob(this.options.defaultContainer, key)
  }

  async list(prefix: string = ''): Promise<string[]> {
    const container = /* get container client */
    const items: string[] = []
    for await (const blob of container.listBlobsFlat({ prefix })) {
      items.push(blob.name)
    }
    return items
  }
}
