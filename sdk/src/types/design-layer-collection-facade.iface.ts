import type {
  AggregatedFileBitmapAssetDescriptor,
  AggregatedFileFontDescriptor,
  ArtboardId,
  FileLayerSelector,
  LayerId,
} from '@opendesign/octopus-reader'
import type { Bounds, LayerAttributesConfig } from '@opendesign/rendering/dist'
import type { ILayerFacade } from './layer-facade.iface'

export interface IDesignLayerCollectionFacade {
  readonly length: number

  [Symbol.iterator](): Iterator<ILayerFacade>

  getLayers(): Array<ILayerFacade>

  findLayer(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerFacade | null
  findLayers(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): IDesignLayerCollectionFacade

  forEach(
    fn: (layer: ILayerFacade, index: number, layers: Array<ILayerFacade>) => any
  ): void

  filter(
    filter: (layer: ILayerFacade, index: number) => boolean
  ): IDesignLayerCollectionFacade

  map<T>(
    mapper: (
      layer: ILayerFacade,
      index: number,
      layers: Array<ILayerFacade>
    ) => T
  ): Array<T>
  flatMap<T>(
    mapper: (
      layer: ILayerFacade,
      index: number,
      layers: Array<ILayerFacade>
    ) => Array<T>
  ): Array<T>

  reduce<T>(
    reducer: (state: T, layer: ILayerFacade, index: number) => T,
    initialValue?: T
  ): T

  concat(
    addedLayers: IDesignLayerCollectionFacade | Array<ILayerFacade>
  ): IDesignLayerCollectionFacade

  flatten(options?: Partial<{ depth: number }>): IDesignLayerCollectionFacade

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>

  renderToFile(
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>
}
