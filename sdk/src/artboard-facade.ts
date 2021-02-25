import { LayerFacade } from './layer-facade'
import { LayerCollectionFacade } from './layer-collection-facade'

import type {
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

  async getContent() {
    const artboardEntity = this._artboardEntity
    if (!artboardEntity.isLoaded()) {
      await this._designFacade.loadArtboard(this.id)
    }

    const octopus = artboardEntity.getOctopus()
    if (!octopus) {
      throw new Error('The artboard octopus is not available')
    }

    return octopus
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

  async load(): Promise<void> {
    if (this.isLoaded()) {
      return
    }

    await this._designFacade.loadArtboard(this.id)
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

  async getBitmapAssets(
    options: Partial<{ includePrerendered: boolean }> = {}
  ) {
    await this.load()

    return this._artboardEntity.getBitmapAssets(options)
  }

  async getFonts(options: Partial<{ depth: number }> = {}) {
    await this.load()

    return this._artboardEntity.getFonts(options)
  }

  async getBackgroundColor(): Promise<RgbaColor | null> {
    await this.load()

    return this._artboardEntity.getBackgroundColor()
  }

  async getRootLayers() {
    await this.load()

    const layerCollection = this._artboardEntity.getRootLayers()
    return new LayerCollectionFacade(layerCollection, { artboardFacade: this })
  }

  async getFlattenedLayers(options: Partial<{ depth: number }> = {}) {
    await this.load()

    const layerCollection = this._artboardEntity.getFlattenedLayers(options)
    return new LayerCollectionFacade(layerCollection, { artboardFacade: this })
  }

  async getLayerById(layerId: LayerId) {
    await this.load()
    return this.getLayerFacadeById(layerId)
  }

  getLayerFacadeById(layerId: LayerId) {
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

  async findLayer(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    await this.load()

    const layerEntity = this._artboardEntity.findLayer(selector, options)
    return layerEntity ? this.getLayerById(layerEntity.id) : null
  }

  async findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    await this.load()

    const layerCollection = this._artboardEntity.findLayers(selector, options)
    return new LayerCollectionFacade(layerCollection, { artboardFacade: this })
  }

  async getLayerDepth(layerId: LayerId) {
    await this.load()

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
