import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedFontDescriptor,
  IBitmap,
  IEffects,
  ILayer,
  IShape,
  IText,
  LayerId,
  LayerSelector,
} from '@opendesign/octopus-reader/types'
import type { IArtboardFacade } from './artboard-facade.iface'
import type { ILayerCollectionFacade } from './layer-collection-facade.iface'

export interface ILayerFacade {
  readonly id: LayerId
  readonly name: ILayer['name']
  readonly type: ILayer['type']
  readonly octopus: ILayer['octopus']

  getArtboard(): IArtboardFacade | null

  isRootLayer(): boolean
  getDepth(): number

  getParentLayer(): ILayerFacade | null
  getParentLayers(): ILayerCollectionFacade
  getParentLayerIds(): Array<LayerId>
  findParentLayer(selector: LayerSelector): ILayerFacade | null
  findParentLayers(selector: LayerSelector): ILayerCollectionFacade

  hasNestedLayers(): boolean
  getNestedLayers(options?: Partial<{ depth: number }>): ILayerCollectionFacade
  findNestedLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerFacade | null
  findNestedLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollectionFacade

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
  getPrerenderedBitmap(): IBitmap | null
  getShape(): IShape | null
  getText(): IText | null

  getEffects(): IEffects
}
