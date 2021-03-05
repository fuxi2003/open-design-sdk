import { memoize } from '@opendesign/octopus-reader/src/utils/memoize'

import {
  AggregatedFileBitmapAssetDescriptor,
  FileLayerDescriptor,
  IFileLayerCollection,
  AggregatedFileFontDescriptor,
  FileLayerSelector,
} from '@opendesign/octopus-reader/types'
import type { DesignFacade } from './design-facade'
import type { IDesignLayerCollectionFacade } from './types/design-layer-collection-facade.iface'

export type DesignLayerDescriptor = {
  artboardId: ArtboardId
  layer: LayerFacade
}

export class DesignLayerCollectionFacade
  implements IDesignLayerCollectionFacade {
  private _layerCollection: IFileLayerCollection
  private _designFacade: DesignFacade

  constructor(
    layerCollection: IFileLayerCollection,
    params: { designFacade: DesignFacade }
  ) {
    this._layerCollection = layerCollection
    this._designFacade = params.designFacade
  }

  [Symbol.iterator](): Iterator<DesignLayerDescriptor> {
    return this.getLayers().values()
  }

  get length() {
    return this._layerCollection.length
  }

  getFileLayerCollectionEntity() {
    return this._layerCollection
  }

  getLayers = memoize(
    (): Array<DesignLayerDescriptor> => {
      return this._layerCollection
        .map((layerEntityDesc) => {
          return this._resolveArtboardLayerDescriptor(layerEntityDesc)
        })
        .filter(Boolean) as Array<DesignLayerDescriptor>
    }
  )

  findLayer(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): DesignLayerDescriptor | null {
    const layerEntityDesc = this._layerCollection.findLayer(selector, options)
    return layerEntityDesc
      ? this._resolveArtboardLayerDescriptor(layerEntityDesc)
      : null
  }

  findLayers(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): DesignLayerCollectionFacade {
    const layerCollection = this._layerCollection.findLayers(selector, options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  filter(
    filter: (layerDesc: DesignLayerDescriptor) => boolean
  ): DesignLayerCollectionFacade {
    const layerCollection = this._layerCollection.filter((layerEntityDesc) => {
      const layerFacadeDesc = this._resolveArtboardLayerDescriptor(
        layerEntityDesc
      )
      return Boolean(layerFacadeDesc && filter(layerFacadeDesc))
    })

    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  map<T>(mapper: (layerDesc: DesignLayerDescriptor) => T): Array<T> {
    return this.getLayers().map(mapper)
  }

  flatMap<T>(mapper: (layerDesc: DesignLayerDescriptor) => Array<T>): Array<T> {
    return this.getLayers().flatMap(mapper)
  }

  reduce<T>(
    reducer: (state: T, layer: DesignLayerDescriptor, index: number) => T,
    initialValue: T
  ): T {
    return this.getLayers().reduce(reducer, initialValue)
  }

  concat(
    addedLayers:
      | DesignLayerCollectionFacade
      | Array<{
          artboardId: ArtboardId
          layer: LayerFacade
        }>
  ): DesignLayerCollectionFacade {
    const addedLayerList = Array.isArray(addedLayers)
      ? addedLayers.map(({ artboardId, layer: layerFacade }) => {
          return { artboardId, layer: layerFacade.getLayerEntity() }
        })
      : addedLayers.getFileLayerCollectionEntity()

    const nextLayerCollection = this._layerCollection.concat(addedLayerList)

    return new DesignLayerCollectionFacade(nextLayerCollection, {
      designFacade: this._designFacade,
    })
  }

  flatten(options: { depth?: number } = {}): DesignLayerCollectionFacade {
    const flattenedLayerCollection = this._layerCollection.flatten(options)

    return new DesignLayerCollectionFacade(flattenedLayerCollection, {
      designFacade: this._designFacade,
    })
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    return this._layerCollection.getBitmapAssets(options)
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedFileFontDescriptor> {
    return this._layerCollection.getFonts(options)
  }

  private _resolveArtboardLayerDescriptor(
    layerEntityDesc: FileLayerDescriptor
  ): DesignLayerDescriptor | null {
    const layerFacade = this._designFacade.getArtboardLayerFacade(
      layerEntityDesc.artboardId,
      layerEntityDesc.layer.id
    )
    return layerFacade
      ? { artboardId: layerEntityDesc.artboardId, layer: layerFacade }
      : null
  }
}
