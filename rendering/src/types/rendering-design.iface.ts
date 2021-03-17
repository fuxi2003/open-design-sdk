export interface IRenderingDesign {
  readonly id: string

  isArtboardLoaded(artboardId: string): boolean
  isArtboardReady(artboardId: string): boolean

  loadArtboard(
    artboardId: string,
    params: {
      octopusFilename: string
      symbolId?: string | null
    }
  ): Promise<{ ready: boolean; pendingSymbolIds: Array<string> }>

  renderArtboardToFile(artboardId: string, relPath: string): Promise<void>

  renderPageToFile(pageId: string, relPath: string): Promise<void>

  renderArtboardLayerToFile(
    artboardId: string,
    layerId: string,
    relPath: string
  ): Promise<void>

  renderArtboardLayersToFile(
    artboardId: string,
    layerIds: Array<string>,
    relPath: string
  ): Promise<void>
}
