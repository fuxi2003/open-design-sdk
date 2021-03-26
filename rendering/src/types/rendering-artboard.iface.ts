import { BlendingMode } from './commands.type'

export type Bounds = {
  left: number
  top: number
  width: number
  height: number
}

export type LayerBounds = {
  bounds: Bounds
  fullBounds: Bounds
  affectedBounds: Bounds
  logicalBounds: Bounds
  untransformedBounds: Bounds
}

export type LayerAttributesConfig = {
  includeEffects?: boolean
  clip?: boolean
  includeArtboardBackground?: boolean
  blendingMode?: BlendingMode
  opacity?: number
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

  renderToFile(filePath: string): Promise<void>

  renderLayerToFile(
    layerId: string,
    filePath: string,
    options?: LayerAttributesConfig
  ): Promise<void>

  renderLayersToFile(
    layerIds: Array<string>,
    filePath: string,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
    }
  ): Promise<void>

  getLayerBounds(layerId: string): Promise<LayerBounds>
}
