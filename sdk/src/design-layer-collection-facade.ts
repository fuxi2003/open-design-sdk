import { memoize } from './utils/memoize'

import {
  AggregatedFileBitmapAssetDescriptor,
  ILayerCollection,
  AggregatedFileFontDescriptor,
  FileLayerSelector,
  ArtboardId,
  LayerId,
  ILayer,
} from '@opendesign/octopus-reader'
import type { DesignFacade } from './design-facade'
import type { LayerFacade } from './layer-facade'
import type { IDesignLayerCollectionFacade } from './types/design-layer-collection-facade.iface'

export class DesignLayerCollectionFacade
  implements IDesignLayerCollectionFacade {
  private _layerCollection: ILayerCollection
  private _designFacade: DesignFacade

  /** @internal */
  constructor(
    layerCollection: ILayerCollection,
    params: {
      designFacade: DesignFacade
    }
  ) {
    this._layerCollection = layerCollection
    this._designFacade = params.designFacade
  }

  /**
   * Returns an iterator which iterates over the collection layers.
   *
   * Nested layers not explicitly included in the collection are not iterated over.
   *
   * @category Iteration
   */
  [Symbol.iterator](): Iterator<LayerFacade> {
    return this.getLayers().values()
  }

  /**
   * Returns the number of layers explicitly included in the collection.
   *
   * This count reflects the number of items returned by {@link DesignLayerCollectionFacade.getLayers} and the native iterator.
   *
   * @category Iteration
   */
  get length() {
    return this._layerCollection.length
  }

  /** @internal */
  getFileLayerCollectionEntity() {
    return this._layerCollection
  }

  /**
   * Returns the collection layers as a native `Array`.
   *
   * Nested layers not explicitly included in the collection are not iterated over.
   *
   * @category Layer Lookup
   */
  getLayers() {
    return this._getLayersMemoized()
  }

  private _getLayersMemoized = memoize(
    (): Array<LayerFacade> => {
      return this._layerCollection
        .map((layerEntity) => {
          return this._resolveArtboardLayer(layerEntity)
        })
        .filter(Boolean) as Array<LayerFacade>
    }
  )

  /**
   * Returns the first layer object from the collection (optionally down to a specific nesting level) matching the specified criteria.
   *
   * Both layers explicitly included in the collection and layers nested within those layers are searched.
   *
   * Note that the layer subtrees within the individual layers explicitly included in the collection are walked in *document order*, not level by level, which means that nested layers of a layer are searched before searching sibling layers of the layer.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the layers explictly included in the collection to search. By default, all levels are searched.
   */
  findLayer(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): LayerFacade | null {
    const layerEntity = this._layerCollection.findLayer(selector, options)
    return layerEntity ? this._resolveArtboardLayer(layerEntity) : null
  }

  /**
   * Returns a collection of all layer objects from the collection (optionally down to a specific nesting level) matching the specified criteria.
   *
   * Both layers explicitly included in the collection and layers nested within those layers are searched.
   *
   * Note that the results from layer subtrees within the individual layers explicitly included in the collection are sorted in *document order*, not level by level, which means that nested layers of a layer are included before matching sibling layers of the layer.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the layers explictly included in the collection to search. By default, all levels are searched.
   */
  findLayers(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): DesignLayerCollectionFacade {
    const layerCollection = this._layerCollection.findLayers(selector, options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns a new layer collection which only includes layers for which the filter returns `true`.
   *
   * Layers nested in the layers explicitly included in the collection are not iterated over.
   *
   * @category Iteration
   * @param filter The filter to apply to the layers in the collection.
   */
  filter(
    filter: (layer: LayerFacade, index: number) => boolean
  ): DesignLayerCollectionFacade {
    const layerCollection = this._layerCollection.filter(
      (layerEntity, index) => {
        const layerFacade = this._resolveArtboardLayer(layerEntity)
        return Boolean(layerFacade && filter(layerFacade, index))
      }
    )

    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Iterates over the the layers in the collection and invokes the provided function with each one of them.
   *
   * Layers nested in the layers explicitly included in the collection are not iterated over.
   *
   * @category Iteration
   * @param fn The function to apply to the layers in the collection.
   */
  forEach(
    fn: (layer: LayerFacade, index: number, layers: Array<LayerFacade>) => any
  ) {
    this.getLayers().forEach(fn)
  }

  /**
   * Returns a native `Array` which returns mapper function results for each of the layers from the collection.
   *
   * Layers nested in the layers explicitly included in the collection are not iterated over.
   *
   * @category Iteration
   * @param mapper The mapper function to apply to the layers in the collection.
   */
  map<T>(
    mapper: (layer: LayerFacade, index: number, layers: Array<LayerFacade>) => T
  ): Array<T> {
    return this.getLayers().map(mapper)
  }

  /**
   * Returns a native `Array` which returns mapper function results for all of the layers from the collection. The arrays produced by the mapper function are concatenated (flattened).
   *
   * Layers nested in the layers explicitly included in the collection are not iterated over.
   *
   * @category Iteration
   * @param mapper The mapper function to apply to the layers in the collection.
   */
  flatMap<T>(
    mapper: (
      layer: LayerFacade,
      index: number,
      layers: Array<LayerFacade>
    ) => Array<T>
  ): Array<T> {
    return this.getLayers().flatMap(mapper)
  }

  /**
   * Returns a reduction of all layers from the collection.
   *
   * Layers nested in the layers explicitly included in the collection are not iterated over.
   *
   * @category Iteration
   * @param reducer The reducer function to apply to the layers in the collection.
   * @param initialValue The value passed as the first argument to the reducer function applied to the first layer in the collection.
   */
  reduce<T>(
    reducer: (state: T, layer: LayerFacade, index: number) => T,
    initialValue: T
  ): T {
    return this.getLayers().reduce(reducer, initialValue)
  }

  /**
   * Returns a new layer collection which includes all layers explicitly included in the original collection and the provided collection.
   *
   * Layers nested in the layers explicitly included in the collections are not explictly included in the new collection either.
   *
   * @category Collection Manipulation
   * @param addedLayers The layer collection to concatenate with the original collection. A native `Array` of layer objects can be provided instead of an actual collection object.
   */
  concat(
    addedLayers: DesignLayerCollectionFacade | Array<LayerFacade>
  ): DesignLayerCollectionFacade {
    const addedLayerList = Array.isArray(addedLayers)
      ? addedLayers.map((layerFacade) => {
          return layerFacade.getLayerEntity()
        })
      : addedLayers.getFileLayerCollectionEntity()

    const nextLayerCollection = this._layerCollection.concat(addedLayerList)

    return new DesignLayerCollectionFacade(nextLayerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns a new layer collection which includes all layers explicitly included in the original collection as well as layers nested within those layers (optionally down to a specific nesting level).
   *
   * @category Collection Manipulation
   * @param options.depth The maximum nesting level within the layers explicitly included in the original collection to explicitly include in the new collection.
   */
  flatten(options: { depth?: number } = {}): DesignLayerCollectionFacade {
    const flattenedLayerCollection = this._layerCollection.flatten(options)

    return new DesignLayerCollectionFacade(flattenedLayerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns a list of bitmap assets used by the layers in the collection within the layer (optionally down to a specific nesting level).
   *
   * Both layers explicitly included in the collection and layers nested within those layers are searched.
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within the layer to search for bitmap asset usage. By default, all levels are searched. Specifying the depth of `0` leads to nested layer bitmap assets being omitted altogether.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   */
  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    return this._layerCollection.getBitmapAssets(options)
  }

  /**
   * Returns a list of fonts used by the layers in the collection within the layer (optionally down to a specific nesting level).
   *
   * Both layers explicitly included in the collection and layers nested within those layers are searched.
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within the layer to search for font usage. By default, all levels are searched. Specifying the depth of `0` leads to nested layer bitmap assets being omitted altogether.
   */
  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedFileFontDescriptor> {
    return this._layerCollection.getFonts(options)
  }

  private _resolveArtboardLayer(layerEntity: ILayer): LayerFacade | null {
    const artboardId = layerEntity.artboardId
    if (!artboardId) {
      return null
    }

    return this._designFacade.getArtboardLayerFacade(artboardId, layerEntity.id)
  }

  /**
   * Renders all layers in the collection as a single image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param filePath The target location of the produced image file.
   */
  async renderToFile(filePath: string): Promise<void> {
    const layerIds = this.getLayers().map((layer) => {
      return layer.id
    })

    const artboardIds = [...new Set(this.getLayers().map((layer) => layer.id))]
    const artboardId = artboardIds.length === 1 ? artboardIds[0] : null
    if (!artboardId) {
      throw new Error(
        'The number of artboards from which to render layers must be exactly 1'
      )
    }

    return this._designFacade.renderArtboardLayersToFile(
      artboardId,
      layerIds,
      filePath
    )
  }
}
