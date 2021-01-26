import { LayerCollection } from '../collections/layer-collection'

import { createLayers } from '../utils/layer-factories'
import { memoize } from '../utils/memoize'

import type { IArtboard } from '../types/artboard.iface'
import type { LayerId } from '../types/ids.type'
import type { ILayer } from '../types/layer.iface'
import type { ILayerCollection } from '../types/layer-collection.iface'
import type { LayerOctopusData } from '../types/octopus.type'
import type { LayerSelector } from '../types/selectors.type'

export class Layer implements ILayer {
  readonly id: LayerId
  readonly name: string | null
  readonly type: LayerOctopusData['type']
  readonly octopus: LayerOctopusData

  private _artboard: IArtboard | null

  constructor(
    layerOctopus: LayerOctopusData,
    params: Partial<{
      artboard: IArtboard | null
    }> = {}
  ) {
    this.id = layerOctopus['id']
    this.name = layerOctopus['name']
    this.type = layerOctopus['type']
    this.octopus = layerOctopus

    this._artboard = params.artboard || null
  }

  getArtboard(): IArtboard | null {
    return this._artboard
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
}
