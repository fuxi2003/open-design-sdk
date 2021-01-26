import { Bitmap } from '../layer-info/bitmap'
import { Effects } from '../layer-info/effects'
import { LayerCollection } from '../collections/layer-collection'
import { Shape } from '../layer-info/shape'
import { Text } from '../layer-info/text'

import { createLayers } from '../utils/layer-factories'
import { memoize } from '../utils/memoize'

import type { IArtboard } from '../types/artboard.iface'
import type { IBitmap } from '../types/bitmap.iface'
import type { IEffects } from '../types/effects.iface'
import type { LayerId } from '../types/ids.type'
import type { ILayer } from '../types/layer.iface'
import type { ILayerCollection } from '../types/layer-collection.iface'
import type { LayerOctopusData } from '../types/octopus.type'
import type { LayerSelector } from '../types/selectors.type'
import type { IShape } from '../types/shape.iface'
import type { IText } from '../types/text.iface'

export class Layer implements ILayer {
  readonly id: LayerId
  readonly name: string | null
  readonly type: LayerOctopusData['type']
  readonly octopus: LayerOctopusData

  private _artboard: IArtboard | null
  private _parentLayerId: LayerId | null

  constructor(
    layerOctopus: LayerOctopusData,
    params: Partial<{
      parentLayerId: LayerId | null
      artboard: IArtboard | null
    }> = {}
  ) {
    this.id = layerOctopus['id']
    this.name = layerOctopus['name']
    this.type = layerOctopus['type']
    this.octopus = layerOctopus

    this._artboard = params.artboard || null
    this._parentLayerId = params.parentLayerId || null
  }

  getArtboard(): IArtboard | null {
    return this._artboard
  }

  isRootLayer() {
    return !this._parentLayerId
  }

  getDepth(): number {
    const parentLayerId = this._parentLayerId
    if (!parentLayerId) {
      return 0
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot determine detached layer depth')
    }

    const parentLayerDepth = artboard.getLayerDepth(parentLayerId)
    if (parentLayerDepth === null) {
      throw new Error('Cannot determine parent layer depth')
    }

    return 1 + parentLayerDepth
  }

  getParentLayerId(): LayerId | null {
    return this._parentLayerId
  }

  getParentLayer(): ILayer | null {
    const parentLayerId = this._parentLayerId
    if (!parentLayerId) {
      return null
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot retrieve the parent layer of a detached layer')
    }

    const parentLayer = artboard.getLayerById(parentLayerId)
    if (!parentLayer) {
      throw new Error('Cannot retrieve the parent layer')
    }

    return parentLayer
  }

  getParentLayerIds(): Array<LayerId> {
    const parentLayer = this.getParentLayer()

    return parentLayer
      ? [parentLayer.id, ...parentLayer.getParentLayerIds()]
      : []
  }

  getParentLayers(): ILayerCollection {
    const parentLayer = this.getParentLayer()
    return parentLayer
      ? new LayerCollection([parentLayer], this._artboard).concat(
          parentLayer.getParentLayers()
        )
      : new LayerCollection([], this._artboard)
  }

  findParentLayer(selector: LayerSelector): ILayer | null {
    const parentLayers = this.getParentLayers()
    return parentLayers.findLayer(selector, { depth: 1 })
  }

  findParentLayers(selector: LayerSelector): ILayerCollection {
    const parentLayers = this.getParentLayers()
    return parentLayers.findLayers(selector, { depth: 1 })
  }

  hasNestedLayers(): boolean {
    return Boolean(this.octopus['layers'] && this.octopus['layers'].length > 0)
  }

  getNestedLayers = memoize(
    (options: Partial<{ depth: number }> = {}): ILayerCollection => {
      const depth = options.depth || 1

      const nestedLayers = this._getDirectlyNestedLayers()

      return depth === 1
        ? nestedLayers
        : nestedLayers.flatten({ depth: depth - 1 })
    },
    2
  )

  findNestedLayer(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): ILayer | null {
    const depth = options.depth || Infinity
    const nestedLayers = this._getDirectlyNestedLayers()

    return nestedLayers.findLayer(selector, { depth })
  }

  findNestedLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): ILayerCollection {
    const depth = options.depth || Infinity
    const nestedLayers = this._getDirectlyNestedLayers()

    return nestedLayers.findLayers(selector, { depth })
  }

  _getDirectlyNestedLayers = memoize(
    (): ILayerCollection => {
      return new LayerCollection(
        createLayers(this.octopus['layers'] || [], {
          parentLayerId: this.id,
          artboard: this._artboard,
        }),
        this._artboard
      )
    }
  )

  isMasked(): boolean {
    return Boolean(this.octopus['clipped'])
  }

  getMaskLayerId(): LayerId | null {
    return this.octopus['maskedBy'] || null
  }

  getMaskLayer(): ILayer | null {
    const maskLayerId = this.getMaskLayerId()
    if (!maskLayerId) {
      return null
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot retrieve a detached layer mask')
    }

    const maskLayer = artboard.getLayerById(maskLayerId)
    if (!maskLayer) {
      throw new Error('Cannot retrieve the mask layer')
    }

    return maskLayer
  }

  isInlineArtboard(): boolean {
    return Boolean(this.octopus['artboard'])
  }

  isComponentInstance(): boolean {
    return Boolean(this.octopus['symbolID'] || this.octopus['documentId'])
  }

  getComponentArtboard(): IArtboard | null {
    const componentArtboardId = this.octopus['documentId']
    if (!componentArtboardId) {
      return null
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot retrieve detached layer component artboard info')
    }

    const file = artboard.getFile()
    if (!file) {
      throw new Error(
        'Cannot retrieve detached artboard layer component artboard info'
      )
    }

    return file.getArtboardById(componentArtboardId)
  }

  hasComponentOverrides(): boolean {
    return Boolean(
      this.octopus['overrides'] && this.octopus['overrides'].length > 0
    )
  }

  getBitmap = memoize((): IBitmap | null => {
    return this.type === 'layer' && this.octopus['bitmap']
      ? new Bitmap(this.octopus['bitmap'])
      : null
  })

  getPrerenderedBitmap = memoize((): IBitmap | null => {
    return this.type !== 'layer' && this.octopus['bitmap']
      ? new Bitmap(this.octopus['bitmap'])
      : null
  })

  getShape = memoize((): IShape | null => {
    return this.octopus['shape'] ? new Shape(this.octopus['shape']) : null
  })

  getText = memoize((): IText | null => {
    return this.octopus['text'] ? new Text(this.octopus['text']) : null
  })

  getEffects = memoize(
    (): IEffects => {
      return new Effects(this.octopus['effects'] || {})
    }
  )
}
