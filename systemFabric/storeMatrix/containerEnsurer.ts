export class ContainerEnsurer {
  constructor(private serviceUrl: string, private credential: any) {}

  private getService() {
    const pipeline = /* create pipeline with credential */
    return new (/* BlobServiceClient */)(this.serviceUrl, pipeline)
  }

  async ensure(containerName: string): Promise<void> {
    const service = this.getService()
    const container = service.getContainerClient(containerName)
    const exists = await container.exists()
    if (!exists) {
      await container.create({ access: 'container' })
    }
  }

  async delete(containerName: string): Promise<void> {
    const service = this.getService()
    await service.getContainerClient(containerName).deleteIfExists()
  }
}
