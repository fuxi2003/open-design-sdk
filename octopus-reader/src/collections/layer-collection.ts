import {
  keepUniqueBitmapAssetDescriptors,
  keepUniqueFontDescriptors,
} from '../utils/assets'
import { createLayerMap } from '../utils/layer-factories'
import { findLayerInLayers, findLayersInLayers } from '../utils/layer-lookup'

import type { ILayerCollection } from '../types/layer-collection.iface'
import type { IArtboard } from '../types/artboard.iface'
import type { LayerId } from '../types/ids.type'
import type { ILayer } from '../types/layer.iface'
import type { LayerSelector } from '../types/selectors.type'
import type { AggregatedBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { AggregatedFontDescriptor } from '../types/fonts.type'

export class LayerCollection implements ILayerCollection {
  readonly length: number

  private _artboard: IArtboard | null
  private _layerList: Array<ILayer>

  private _layersById: Record<LayerId, ILayer>

  constructor(layerList: Array<ILayer>, artboard: IArtboard | null = null) {
    this.length = layerList.length

    this._artboard = artboard
    this._layerList = layerList

    this._layersById = createLayerMap(layerList)
  }

  [Symbol.iterator]() {
    return this._layerList[Symbol.iterator]()
  }

  getLayers(): Array<ILayer> {
    return this._layerList
  }

  getLayerById(layerId: LayerId): ILayer | null {
    return this._layersById[layerId] || null
  }

  findLayer(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): ILayer | null {
    return findLayerInLayers(selector, this._layerList, options)
  }

  findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): ILayerCollection {
    const matchedLayers = findLayersInLayers(selector, this._layerList, options)
    return new LayerCollection(matchedLayers, this._artboard)
  }

  filter(filter: (layer: ILayer) => boolean): ILayerCollection {
    const filteredLayers = this.getLayers().filter(filter)
    return new LayerCollection(filteredLayers, this._artboard)
  }

  map<T>(mapper: (layer: ILayer) => T): Array<T> {
    return this.getLayers().map(mapper)
  }

  flatMap<T>(mapper: (layer: ILayer) => Array<T>): Array<T> {
    return this.getLayers().flatMap(mapper)
  }

  reduce<T>(
    reducer: (state: T, layer: ILayer, index: number) => T,
    initialValue: T
  ): T {
    return this.getLayers().reduce(reducer, initialValue)
  }

  concat(addedLayers: Array<ILayer> | ILayerCollection): ILayerCollection {
    const addedLayerList = Array.isArray(addedLayers)
      ? addedLayers
      : addedLayers.getLayers()
    const layers = [...this.getLayers(), ...addedLayerList]

    return new LayerCollection(layers, this._artboard)
  }

  flatten(options: Partial<{ depth: number }> = {}): ILayerCollection {
    const depth = options.depth || Infinity

    const flattenedLayers = this.getLayers().flatMap((layer) => {
      return [layer, ...layer.getNestedLayers({ depth })]
    })

    return new LayerCollection(flattenedLayers, this._artboard)
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedBitmapAssetDescriptor> {
    return keepUniqueBitmapAssetDescriptors(
      this.getLayers().flatMap((layer) => {
        return layer.getBitmapAssets(options)
      })
    )
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedFontDescriptor> {
    return keepUniqueFontDescriptors(
      this.getLayers().flatMap((layer) => {
        return layer.getFonts(options)
      })
    )
  }
}
