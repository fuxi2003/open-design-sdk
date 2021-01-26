import type { IFile } from './file.iface'
import type { ArtboardId, LayerId, PageId } from './ids.type'
import type { ILayerCollection } from './layer-collection.iface'
import type { ILayer } from './layer.iface'
import type { ArtboardOctopusData, RgbaColor } from './octopus.type'
import type { LayerSelector } from './selectors.type'

export interface IArtboard {
  readonly id: ArtboardId
  readonly pageId: PageId | null
  readonly name: string | null
  readonly octopus: ArtboardOctopusData

  getFile(): IFile | null

  getBackgroundColor(): RgbaColor | null

  getRootLayers(): ILayerCollection
  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection

  getLayerById(layerId: LayerId): ILayer | null
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayer | null

  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  getLayerDepth(layerId: LayerId): number | null

  isComponent(): boolean
}
