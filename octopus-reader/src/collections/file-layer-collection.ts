import {
  keepUniqueFileBitmapAssetDescriptors,
  keepUniqueFileFontDescriptors,
} from '../utils/assets'
import {
  findLayerInFileLayers,
  findLayersInFileLayers,
} from '../utils/layer-lookup'

import type { AggregatedFileBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type {
  FileLayerDescriptor,
  IFileLayerCollection,
} from '../types/file-layer-collection.iface'
import type { IFile } from '../types/file.iface'
import type { AggregatedFileFontDescriptor } from '../types/fonts.type'
import type { LayerSelector } from '../types/selectors.type'

export class FileLayerCollection implements IFileLayerCollection {
  readonly length: number

  private _file: IFile | null
  private _layerDescList: Array<FileLayerDescriptor>

  constructor(
    layerDescList: Array<FileLayerDescriptor>,
    file: IFile | null = null
  ) {
    this.length = layerDescList.length

    this._file = file
    this._layerDescList = layerDescList
  }

  [Symbol.iterator]() {
    return this._layerDescList[Symbol.iterator]()
  }

  getLayers(): Array<FileLayerDescriptor> {
    return this._layerDescList
  }

  findLayer(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): FileLayerDescriptor | null {
    return findLayerInFileLayers(selector, this._layerDescList, options)
  }

  findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): IFileLayerCollection {
    const matchedLayers = findLayersInFileLayers(
      selector,
      this._layerDescList,
      options
    )
    return new FileLayerCollection(matchedLayers, this._file)
  }

  forEach(
    fn: (
      layerDesc: FileLayerDescriptor,
      index: number,
      layerDescs: Array<FileLayerDescriptor>
    ) => any
  ): void {
    this.getLayers().forEach(fn)
  }

  filter(
    filter: (
      layerDesc: FileLayerDescriptor,
      index: number,
      layerDescs: Array<FileLayerDescriptor>
    ) => boolean
  ): IFileLayerCollection {
    const filteredLayerDescs = this.getLayers().filter(filter)
    return new FileLayerCollection(filteredLayerDescs, this._file)
  }

  map<T>(
    mapper: (
      layerDesc: FileLayerDescriptor,
      index: number,
      layerDescs: Array<FileLayerDescriptor>
    ) => T
  ): Array<T> {
    return this.getLayers().map(mapper)
  }

  flatMap<T>(
    mapper: (
      layerDesc: FileLayerDescriptor,
      index: number,
      layerDescs: Array<FileLayerDescriptor>
    ) => Array<T>
  ): Array<T> {
    return this.getLayers().flatMap(mapper)
  }

  reduce<T>(
    reducer: (state: T, layerDesc: FileLayerDescriptor, index: number) => T,
    initialValue: T
  ): T {
    return this.getLayers().reduce(reducer, initialValue)
  }

  concat(
    addedLayers: Array<FileLayerDescriptor> | IFileLayerCollection
  ): IFileLayerCollection {
    const addedLayerList = Array.isArray(addedLayers)
      ? addedLayers
      : addedLayers.getLayers()
    const layers = [...this.getLayers(), ...addedLayerList]

    return new FileLayerCollection(layers, this._file)
  }

  flatten(options: Partial<{ depth: number }> = {}): IFileLayerCollection {
    const depth = options.depth || Infinity

    const flattenedLayers = this.getLayers().flatMap(
      ({ artboardId, layer }) => {
        return [
          { artboardId, layer },
          ...layer.getNestedLayers({ depth }).map((nestedLayer) => {
            return { artboardId, layer: nestedLayer }
          }),
        ]
      }
    )

    return new FileLayerCollection(flattenedLayers, this._file)
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    return keepUniqueFileBitmapAssetDescriptors(
      this.getLayers().flatMap(({ artboardId, layer }) => {
        return layer.getBitmapAssets(options).map((assetDesc) => {
          const { layerIds, ...data } = assetDesc
          return { ...data, artboardLayerIds: { [artboardId]: layerIds } }
        })
      })
    )
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedFileFontDescriptor> {
    return keepUniqueFileFontDescriptors(
      this.getLayers().flatMap(({ artboardId, layer }) => {
        return layer.getFonts(options).map((assetDesc) => {
          const { layerIds, ...data } = assetDesc
          return { ...data, artboardLayerIds: { [artboardId]: layerIds } }
        })
      })
    )
  }
}
