import type {
  AggregatedFileBitmapAssetDescriptor,
  AggregatedFileFontDescriptor,
  ArtboardId,
  FileLayerSelector,
} from '@opendesign/octopus-reader'
import type { ILayerFacade } from './layer-facade.iface'

export interface IDesignLayerCollectionFacade {
  readonly length: number

  [Symbol.iterator](): Iterator<DesignLayerDescriptor>

  getLayers(): Array<DesignLayerDescriptor>

  findLayer(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): DesignLayerDescriptor | null
  findLayers(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): IDesignLayerCollectionFacade

  forEach(
    fn: (
      layerDesc: DesignLayerDescriptor,
      index: number,
      layerDescs: Array<DesignLayerDescriptor>
    ) => any
  ): void

  filter(
    filter: (layerDesc: DesignLayerDescriptor, index: number) => boolean
  ): IDesignLayerCollectionFacade

  map<T>(
    mapper: (
      layerDesc: DesignLayerDescriptor,
      index: number,
      layerDescs: Array<DesignLayerDescriptor>
    ) => T
  ): Array<T>
  flatMap<T>(
    mapper: (
      layerDesc: DesignLayerDescriptor,
      index: number,
      layerDescs: Array<DesignLayerDescriptor>
    ) => Array<T>
  ): Array<T>

  reduce<T>(
    reducer: (state: T, layerDesc: DesignLayerDescriptor, index: number) => T,
    initialValue?: T
  ): T

  concat(
    addedLayers: IDesignLayerCollectionFacade | Array<DesignLayerDescriptor>
  ): IDesignLayerCollectionFacade

  flatten(options?: Partial<{ depth: number }>): IDesignLayerCollectionFacade

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>
}

export type DesignLayerDescriptor = {
  artboardId: ArtboardId
  layer: ILayerFacade
}
