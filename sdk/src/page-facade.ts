import { DesignLayerCollectionFacade } from './design-layer-collection-facade'

import { matchArtboard } from '@opendesign/octopus-reader/src/utils/artboard-lookup'

import type {
  ArtboardId,
  ArtboardSelector,
  ComponentId,
  IPage,
  LayerId,
  LayerSelector,
} from '@opendesign/octopus-reader/types'
import type { ArtboardFacade } from './artboard-facade'
import type { DesignFacade } from './design-facade'
import type { IPageFacade } from './types/page-facade.iface'

export class PageFacade implements IPageFacade {
  private _pageEntity: IPage
  private _designFacade: DesignFacade

  /** @internal */
  constructor(pageEntity: IPage, params: { designFacade: DesignFacade }) {
    this._pageEntity = pageEntity
    this._designFacade = params.designFacade
  }

  get id() {
    return this._pageEntity.id
  }

  get name() {
    return this._pageEntity.name
  }

  /** @internal */
  setPageEntity(pageEntity: IPage) {
    this._pageEntity = pageEntity
  }

  getDesign() {
    return this._designFacade
  }

  isLoaded() {
    const artboards = this.getArtboards()
    return artboards.every((artboard) => {
      return artboard.isLoaded()
    })
  }

  /** @internal */
  async load(): Promise<void> {
    const artboards = this.getArtboards()
    await Promise.all(
      artboards.map((artboard) => {
        return artboard.load()
      })
    )
  }

  getArtboards() {
    return this._designFacade.getPageArtboards(this.id)
  }

  getArtboardById(artboardId: ArtboardId): ArtboardFacade | null {
    const artboard = this._designFacade.getArtboardById(artboardId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  getComponentArtboards(): Array<ArtboardFacade> {
    return this.getArtboards().filter((artboard) => {
      return artboard.isComponent()
    })
  }

  getArtboardByComponentId(componentId: ComponentId): ArtboardFacade | null {
    const artboard = this._designFacade.getArtboardByComponentId(componentId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  findArtboard(selector: ArtboardSelector): ArtboardFacade | null {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      return this.getArtboardById(selector['id'])
    }

    for (const artboard of this.getArtboards()) {
      if (matchArtboard(selector, artboard.getArtboardEntity())) {
        return artboard
      }
    }

    return null
  }

  findArtboards(selector: ArtboardSelector): Array<ArtboardFacade> {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      const artboard = this.getArtboardById(selector['id'])
      return artboard ? [artboard] : []
    }

    return this.getArtboards().filter((artboard) => {
      return matchArtboard(selector, artboard.getArtboardEntity())
    })
  }

  async getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ) {
    await this.load()

    return this._pageEntity.getBitmapAssets(options)
  }

  async getFonts(options: { depth?: number } = {}) {
    await this.load()

    return this._pageEntity.getFonts(options)
  }

  async getFlattenedLayers(options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._pageEntity.getFlattenedLayers(options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  async findLayerById(layerId: LayerId, options: { depth?: number } = {}) {
    await this.load()

    const layerEntityDesc = this._pageEntity.findLayerById(layerId, options)
    const layerFacade = layerEntityDesc
      ? this._designFacade.getArtboardLayerFacade(
          layerEntityDesc.artboardId,
          layerEntityDesc.layer.id
        )
      : null

    return layerFacade && layerEntityDesc
      ? {
          artboardId: layerEntityDesc.artboardId,
          layer: layerFacade,
        }
      : null
  }

  async findLayersById(layerId: LayerId, options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._pageEntity.findLayersById(layerId, options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  async findLayer(selector: LayerSelector, options: { depth?: number } = {}) {
    await this.load()

    const layerEntityDesc = this._pageEntity.findLayer(selector, options)
    const layerFacade = layerEntityDesc
      ? this._designFacade.getArtboardLayerFacade(
          layerEntityDesc.artboardId,
          layerEntityDesc.layer.id
        )
      : null

    return layerFacade && layerEntityDesc
      ? {
          artboardId: layerEntityDesc.artboardId,
          layer: layerFacade,
        }
      : null
  }

  async findLayers(selector: LayerSelector, options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._pageEntity.findLayers(selector, options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }
}
