import type { LayerBounds } from './rendering-artboard.iface'

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

  renderArtboardToFile(artboardId: string, filePath: string): Promise<void>

  renderPageToFile(pageId: string, filePath: string): Promise<void>

  renderArtboardLayerToFile(
    artboardId: string,
    layerId: string,
    filePath: string
  ): Promise<void>

  renderArtboardLayersToFile(
    artboardId: string,
    layerIds: Array<string>,
    filePath: string
  ): Promise<void>

  getArtboardLayerBounds(
    artboardId: string,
    layerId: string
  ): Promise<LayerBounds>
}
