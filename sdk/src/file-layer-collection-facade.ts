import { memoize } from '@opendesign/octopus-reader/src/utils/memoize'

import {
  AggregatedFileBitmapAssetDescriptor,
  FileLayerDescriptor,
  IFileLayerCollection,
  AggregatedFileFontDescriptor,
  LayerSelector,
} from '@opendesign/octopus-reader/types'
import type { DesignFacade } from './design-facade'
import type {
  DesignLayerDescriptor,
  IFileLayerCollectionFacade,
} from './types/ifaces'

export class FileLayerCollectionFacade implements IFileLayerCollectionFacade {
  _layerCollection: IFileLayerCollection
  _designFacade: DesignFacade

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
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): DesignLayerDescriptor | null {
    const layerEntityDesc = this._layerCollection.findLayer(selector, options)
    return layerEntityDesc
      ? this._resolveArtboardLayerDescriptor(layerEntityDesc)
      : null
  }

  findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): FileLayerCollectionFacade {
    const layerCollection = this._layerCollection.findLayers(selector, options)
    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  filter(
    filter: (layerDesc: DesignLayerDescriptor) => boolean
  ): FileLayerCollectionFacade {
    const layerCollection = this._layerCollection.filter((layerEntityDesc) => {
      const layerFacadeDesc = this._resolveArtboardLayerDescriptor(
        layerEntityDesc
      )
      return Boolean(layerFacadeDesc && filter(layerFacadeDesc))
    })

    return new FileLayerCollectionFacade(layerCollection, {
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

  _resolveArtboardLayerDescriptor(
    layerEntityDesc: FileLayerDescriptor
  ): DesignLayerDescriptor | null {
    const layerFacade = this._designFacade.getArtboardLayer(
      layerEntityDesc.artboardId,
      layerEntityDesc.layer.id
    )
    return layerFacade
      ? { artboardId: layerEntityDesc.artboardId, layer: layerFacade }
      : null
  }
}
