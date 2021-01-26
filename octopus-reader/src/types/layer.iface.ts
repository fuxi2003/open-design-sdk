import type { IArtboard } from './artboard.iface'
import type { LayerId } from './ids.type'
import type { ILayerCollection } from './layer-collection.iface'
import type { LayerOctopusData } from './octopus.type'
import type { LayerSelector } from './selectors.type'

export interface ILayer {
  readonly id: LayerId
  readonly name: string | null
  readonly type: LayerOctopusData['type']
  readonly octopus: LayerOctopusData

  getArtboard(): IArtboard | null

  hasNestedLayers(): boolean
  getNestedLayers(options?: Partial<{ depth: number }>): ILayerCollection
  findNestedLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findNestedLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollection
}
