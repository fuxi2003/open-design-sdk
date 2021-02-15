import { LayerCollectionFacade } from './layer-collection-facade'

import type { ILayer, LayerSelector } from '@opendesign/octopus-reader/types'
import type { ArtboardFacade } from './artboard-facade'
import type { ILayerFacade } from './types/ifaces'

export class LayerFacade implements ILayerFacade {
  _layerEntity: ILayer
  _artboardFacade: ArtboardFacade

  constructor(layerEntity: ILayer, params: { artboardFacade: ArtboardFacade }) {
    this._layerEntity = layerEntity
    this._artboardFacade = params.artboardFacade
  }

  get id() {
    return this._layerEntity.id
  }

  get name() {
    return this._layerEntity.name
  }

  get type() {
    return this._layerEntity.type
  }

  get octopus() {
    return this._layerEntity.octopus
  }

  getArtboard() {
    return this._artboardFacade
  }

  getLayerEntity() {
    return this._layerEntity
  }

  isRootLayer() {
    return this._layerEntity.isRootLayer()
  }

  getDepth() {
    return this._layerEntity.getDepth()
  }

  getParentLayer() {
    const layerEntity = this._layerEntity.getParentLayer()
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  getParentLayers() {
    const layerEntities = this._layerEntity.getParentLayers()
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  getParentLayerIds() {
    return this._layerEntity.getParentLayerIds()
  }

  findParentLayer(selector: LayerSelector) {
    const layerEntity = this._layerEntity.findParentLayer(selector)
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  findParentLayers(selector: LayerSelector) {
    const layerEntities = this._layerEntity.findParentLayers(selector)
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  hasNestedLayers() {
    return this._layerEntity.hasNestedLayers()
  }

  getNestedLayers(options?: Partial<{ depth: number }>) {
    const layerEntities = this._layerEntity.getNestedLayers(options)
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  findNestedLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ) {
    const layerEntity = this._layerEntity.findNestedLayer(selector, options)
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  findNestedLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ) {
    const layerEntities = this._layerEntity.findNestedLayers(selector, options)
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  isMasked() {
    return this._layerEntity.isMasked()
  }

  getMaskLayer() {
    const layerEntity = this._layerEntity.getMaskLayer()
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  getMaskLayerId() {
    return this._layerEntity.getMaskLayerId()
  }

  isInlineArtboard() {
    return this._layerEntity.isInlineArtboard()
  }

  isComponentInstance() {
    return this._layerEntity.isComponentInstance()
  }

  hasComponentOverrides() {
    return this._layerEntity.hasComponentOverrides()
  }

  getComponentArtboard() {
    const componentArtboardEntity = this._layerEntity.getComponentArtboard()
    return componentArtboardEntity
      ? this._artboardFacade
          .getDesign()
          .getArtboardById(componentArtboardEntity.id)
      : null
  }

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ) {
    return this._layerEntity.getBitmapAssets(options)
  }

  getFonts(options?: Partial<{ depth: number }>) {
    return this._layerEntity.getFonts(options)
  }

  getBitmap() {
    return this._layerEntity.getBitmap()
  }

  getPrerenderedBitmap() {
    return this._layerEntity.getPrerenderedBitmap()
  }

  getShape() {
    return this._layerEntity.getShape()
  }

  getText() {
    return this._layerEntity.getText()
  }

  getEffects() {
    return this._layerEntity.getEffects()
  }
}
