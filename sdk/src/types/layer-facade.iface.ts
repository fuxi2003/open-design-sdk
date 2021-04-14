import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedFontDescriptor,
  ArtboardId,
  TextFontDescriptor as FontDescriptor,
  IBitmap,
  IEffects,
  ILayer,
  IShape,
  IText,
  LayerId,
  LayerSelector,
} from '@opendesign/octopus-reader'
import type {
  Bounds,
  LayerAttributesConfig,
  LayerBounds,
} from '@opendesign/rendering'
import type { IArtboardFacade } from './artboard-facade.iface'
import type { IDesignLayerCollectionFacade } from './design-layer-collection-facade.iface'

export { FontDescriptor }

export interface ILayerFacade {
  readonly id: LayerId
  readonly name: ILayer['name']
  readonly type: ILayer['type']
  readonly octopus: ILayer['octopus']

  readonly artboardId: ArtboardId | null

  getArtboard(): IArtboardFacade | null

  isRootLayer(): boolean
  getDepth(): number

  getParentLayer(): ILayerFacade | null
  getParentLayers(): IDesignLayerCollectionFacade
  getParentLayerIds(): Array<LayerId>
  findParentLayer(selector: LayerSelector): ILayerFacade | null
  findParentLayers(selector: LayerSelector): IDesignLayerCollectionFacade

  hasNestedLayers(): boolean
  getNestedLayers(
    options?: Partial<{ depth: number }>
  ): IDesignLayerCollectionFacade
  findNestedLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerFacade | null
  findNestedLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): IDesignLayerCollectionFacade

  isMasked(): boolean
  getMaskLayer(): ILayerFacade | null
  getMaskLayerId(): LayerId | null

  isInlineArtboard(): boolean

  isComponentInstance(): boolean
  hasComponentOverrides(): boolean
  getComponentArtboard(): IArtboardFacade | null

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFontDescriptor>

  getBitmap(): IBitmap | null
  isBitmapPrerendered(): boolean
  getShape(): IShape | null
  getText(): IText | null

  getEffects(): IEffects

  renderToFile(
    filePath: string,
    options?: LayerAttributesConfig & {
      bounds?: Bounds
      scale?: number
    }
  ): Promise<void>

  getBounds(): Promise<LayerBounds>
}
