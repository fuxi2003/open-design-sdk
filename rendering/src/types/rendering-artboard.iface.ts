import type { Bounds } from './bounds.type'
import type { LayerAttributesConfig } from './layer-attributes.type'

export type LayerBounds = {
  bounds: Bounds
  fullBounds: Bounds
  affectedBounds: Bounds
  logicalBounds: Bounds
  untransformedBounds: Bounds
}

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

  unload(): Promise<void>

  markAsReady(): Promise<void>

  renderToFile(
    filePath: string,
    options?: { scale?: number; bounds?: Bounds }
  ): Promise<void>

  renderLayerToFile(
    layerId: string,
    filePath: string,
    options?: LayerAttributesConfig & {
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>

  renderLayersToFile(
    layerIds: Array<string>,
    filePath: string,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>

  getLayerBounds(layerId: string): Promise<LayerBounds>

  getLayerAtPosition(x: number, y: number): Promise<string | null>

  getLayersInArea(
    bounds: Bounds,
    options?: { partialOverlap?: boolean }
  ): Promise<Array<string>>
}
