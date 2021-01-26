import {
  findLayerInFileLayers,
  findLayersInFileLayers,
} from '../utils/layer-lookup'

import type {
  FileLayerDescriptor,
  IFileLayerCollection,
} from '../types/file-layer-collection.iface'
import type { IFile } from '../types/file.iface'
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

  filter(
    filter: (layerDesc: FileLayerDescriptor) => boolean
  ): IFileLayerCollection {
    const filteredLayerDescs = this.getLayers().filter(filter)
    return new FileLayerCollection(filteredLayerDescs, this._file)
  }

  map<T>(mapper: (layerDesc: FileLayerDescriptor) => T): Array<T> {
    return this.getLayers().map(mapper)
  }

  flatMap<T>(mapper: (layerDesc: FileLayerDescriptor) => Array<T>): Array<T> {
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
}