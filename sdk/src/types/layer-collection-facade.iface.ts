import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedFontDescriptor,
  LayerId,
  LayerSelector,
} from '@opendesign/octopus-reader/types'
import type { ILayerFacade } from './layer-facade.iface'

export interface ILayerCollectionFacade {
  readonly length: number

  [Symbol.iterator](): Iterator<ILayerFacade>

  getLayers(): Array<ILayerFacade>
  getLayerById(layerId: LayerId): ILayerFacade | null

  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerFacade | null
  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollectionFacade

  filter(filter: (layer: ILayerFacade) => boolean): ILayerCollectionFacade

  map<T>(mapper: (layer: ILayerFacade) => T): Array<T>
  flatMap<T>(mapper: (layer: ILayerFacade) => Array<T>): Array<T>

  reduce<T>(
    reducer: (state: T, layer: ILayerFacade, index: number) => T,
    initialValue?: T
  ): T

  concat(
    addedLayers: ILayerCollectionFacade | Array<ILayerFacade>
  ): ILayerCollectionFacade

  flatten(options?: Partial<{ depth: number }>): ILayerCollectionFacade

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFontDescriptor>
}
