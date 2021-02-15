import { FileLayerCollectionFacade } from './file-layer-collection-facade'

import { matchArtboard } from '@opendesign/octopus-reader/src/utils/artboard-lookup'

import type {
  ArtboardId,
  ArtboardSelector,
  ComponentId,
  IPage,
  LayerId,
  LayerSelector,
} from '@opendesign/octopus-reader/types'
import type { DesignFacade } from './design-facade'
import type { IPageFacade } from './types/ifaces'
import type { ArtboardFacade } from './artboard-facade'

export class PageFacade implements IPageFacade {
  _pageEntity: IPage
  _designFacade: DesignFacade

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

  setPageEntity(pageEntity: IPage) {
    this._pageEntity = pageEntity
  }

  getDesign() {
    return this._designFacade
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

  getBitmapAssets(options: Partial<{ includePrerendered: boolean }> = {}) {
    return this._pageEntity.getBitmapAssets(options)
  }

  getFonts(options: Partial<{ depth: number }> = {}) {
    return this._pageEntity.getFonts(options)
  }

  getFlattenedLayers(options: Partial<{ depth: number }> = {}) {
    const layerCollection = this._pageEntity.getFlattenedLayers(options)
    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  findLayerById(layerId: LayerId, options: Partial<{ depth: number }> = {}) {
    const layerEntityDesc = this._pageEntity.findLayerById(layerId, options)
    const layerFacade = layerEntityDesc
      ? this._designFacade.getArtboardLayer(
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

  findLayersById(layerId: LayerId, options: Partial<{ depth: number }> = {}) {
    const layerCollection = this._pageEntity.findLayersById(layerId, options)
    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  findLayer(selector: LayerSelector, options: Partial<{ depth: number }> = {}) {
    const layerEntityDesc = this._pageEntity.findLayer(selector, options)
    const layerFacade = layerEntityDesc
      ? this._designFacade.getArtboardLayer(
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

  findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    const layerCollection = this._pageEntity.findLayers(selector, options)
    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }
}
