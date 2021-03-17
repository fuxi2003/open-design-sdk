export interface IRenderingArtboard {
  readonly id: string
  readonly symbolId: string | null

  readonly ready: boolean
  readonly pendingSymbolIds: Array<string>

  load(params: {
    octopusFilename: string
    bitmapAssetDirectoryPath?: string | null
    fontDirectoryPath?: string | null
  }): Promise<void>

  renderToFile(relPath: string): Promise<void>

  renderLayerToFile(layerId: string, relPath: string): Promise<void>

  renderLayersToFile(layerIds: Array<string>, relPath: string): Promise<void>
}
