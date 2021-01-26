import type { IFile } from './file.iface'
import type { ArtboardId, LayerId, PageId } from './ids.type'
import type { ILayer } from './layer.iface'
import type { ArtboardOctopusData, RgbaColor } from './octopus.type'

export interface IArtboard {
  readonly id: ArtboardId
  readonly pageId: PageId | null
  readonly name: string | null
  readonly octopus: ArtboardOctopusData

  getFile(): IFile | null


  getRootLayers(): ILayerCollection
  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection

  getLayerById(layerId: LayerId): ILayer | null
  isComponent(): boolean
}
