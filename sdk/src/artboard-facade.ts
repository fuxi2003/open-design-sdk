import { LayerFacade } from './layer-facade'
import { LayerCollectionFacade } from './layer-collection-facade'

import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedFontDescriptor,
  ArtboardManifestData,
  IArtboard,
  LayerId,
  LayerSelector,
  PageId,
  RgbaColor,
} from '@opendesign/octopus-reader/types'
import type { DesignFacade } from './design-facade'
import type { IArtboardFacade } from './types/ifaces'

export class ArtboardFacade implements IArtboardFacade {
  _artboardEntity: IArtboard
  _designFacade: DesignFacade

  _layerFacades: Map<LayerId, LayerFacade> = new Map()

  constructor(
    artboardEntity: IArtboard,
    params: { designFacade: DesignFacade }
  ) {
    this._artboardEntity = artboardEntity
    this._designFacade = params.designFacade
  }

  get id() {
    return this._artboardEntity.id
  }

  get octopus() {
    return this._artboardEntity.octopus
  }

  get pageId() {
    return this._artboardEntity.pageId
  }

  get componentId() {
    return this._artboardEntity.componentId
  }

  get name() {
    return this._artboardEntity.name
  }

  setArtboardEntity(artboardEntity: IArtboard) {
    this._artboardEntity = artboardEntity
  }

  getArtboardEntity() {
    return this._artboardEntity
  }

  getDesign() {
    return this._designFacade
  }

  getManifest() {
    return this._artboardEntity.getManifest()
  }

  setManifest(nextManifestData: ArtboardManifestData) {
    return this._artboardEntity.setManifest(nextManifestData)
  }

  isLoaded() {
    return this._artboardEntity.isLoaded()
  }

  getPage() {
    const pageId = this.pageId
    return pageId ? this._designFacade.getPageById(pageId) : null
  }

  setPage(nextPageId: PageId) {
    this._artboardEntity.setPage(nextPageId)
  }

  unassignFromPage() {
    this._artboardEntity.unassignFromPage()
  }

  getBitmapAssets(
    options: Partial<{ includePrerendered: boolean }> = {}
  ): Array<AggregatedBitmapAssetDescriptor> {
    return this._artboardEntity.getBitmapAssets(options)
  }
  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedFontDescriptor> {
    return this._artboardEntity.getFonts(options)
  }

  getBackgroundColor(): RgbaColor | null {
    return this._artboardEntity.getBackgroundColor()
  }

  getRootLayers() {
    const layerCollection = this._artboardEntity.getRootLayers()
    return new LayerCollectionFacade(layerCollection, { artboardFacade: this })
  }

  getFlattenedLayers(options: Partial<{ depth: number }> = {}) {
    const layerCollection = this._artboardEntity.getFlattenedLayers(options)
    return new LayerCollectionFacade(layerCollection, { artboardFacade: this })
  }

  getLayerById(layerId: LayerId): LayerFacade | null {
    const prevLayerFacade = this._layerFacades.get(layerId)
    if (prevLayerFacade) {
      return prevLayerFacade
    }

    const nextLayerFacade = this._createLayerFacade(layerId)
    if (nextLayerFacade) {
      this._layerFacades.set(layerId, nextLayerFacade)
    }

    return nextLayerFacade
  }

  findLayer(selector: LayerSelector, options: Partial<{ depth: number }> = {}) {
    const layerEntity = this._artboardEntity.findLayer(selector, options)
    return layerEntity ? this.getLayerById(layerEntity.id) : null
  }

  findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    const layerCollection = this._artboardEntity.findLayers(selector, options)
    return new LayerCollectionFacade(layerCollection, { artboardFacade: this })
  }

  getLayerDepth(layerId: LayerId): number | null {
    return this._artboardEntity.getLayerDepth(layerId)
  }

  isComponent() {
    return this._artboardEntity.isComponent()
  }

  _createLayerFacade(layerId: LayerId): LayerFacade | null {
    const artboardEntity = this._artboardEntity
    const layerEntity = artboardEntity
      ? artboardEntity.getLayerById(layerId)
      : null

    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this })
      : null
  }
}
