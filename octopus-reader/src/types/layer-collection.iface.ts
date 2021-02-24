import type { AggregatedBitmapAssetDescriptor } from './bitmap-assets.type'
import type { AggregatedFontDescriptor } from './fonts.type'
import type { LayerId } from './ids.type'
import type { ILayer } from './layer.iface'
import type { LayerSelector } from './selectors.type'

export interface ILayerCollection {
  readonly length: number

  [Symbol.iterator](): Iterator<ILayer>

  getLayers(): Array<ILayer>
  getLayerById(layerId: LayerId): ILayer | null

  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  filter(filter: (layer: ILayer) => boolean): ILayerCollection

  map<T>(mapper: (layer: ILayer) => T): Array<T>
  flatMap<T>(mapper: (layer: ILayer) => Array<T>): Array<T>

  reduce<T>(
    reducer: (state: T, layer: ILayer, index: number) => T,
    initialValue?: T
  ): T

  concat(addedLayers: ILayerCollection | Array<ILayer>): ILayerCollection

  flatten(options?: Partial<{ depth: number }>): ILayerCollection

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFontDescriptor>
}
