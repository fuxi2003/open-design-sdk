import type { AggregatedFileBitmapAssetDescriptor } from './bitmap-assets.type'
import type { AggregatedFileFontDescriptor } from './fonts.type'
import type { ArtboardId } from './ids.type'
import type { ILayer } from './layer.iface'
import type { FileLayerSelector } from './selectors.type'

export interface IFileLayerCollection {
  readonly length: number

  [Symbol.iterator](): Iterator<FileLayerDescriptor>

  getLayers(): Array<FileLayerDescriptor>

  findLayer(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): FileLayerDescriptor | null
  findLayers(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): IFileLayerCollection

  filter(
    filter: (layerDesc: FileLayerDescriptor) => boolean
  ): IFileLayerCollection

  map<T>(mapper: (layerDesc: FileLayerDescriptor) => T): Array<T>
  flatMap<T>(mapper: (layerDesc: FileLayerDescriptor) => Array<T>): Array<T>

  reduce<T>(
    reducer: (state: T, layerDesc: FileLayerDescriptor, index: number) => T,
    initialValue?: T
  ): T

  concat(
    addedLayers: Array<FileLayerDescriptor> | IFileLayerCollection
  ): IFileLayerCollection
  flatten(options?: Partial<{ depth: number }>): IFileLayerCollection

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>
}

export type FileLayerDescriptor = {
  artboardId: ArtboardId
  layer: ILayer
}
