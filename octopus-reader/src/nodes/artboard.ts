import { LayerCollection } from '../collections/layer-collection'

import { createFlattenedLayers, createLayers } from '../utils/layer-factories'
import { memoize } from '../utils/memoize'

import type { IArtboard } from '../types/artboard.iface'
import type { IFile } from '../types/file.iface'
import type { ArtboardId, LayerId, PageId } from '../types/ids.type'
import type { ILayer } from '../types/layer.iface'
import type { ILayerCollection } from '../types/layer-collection.iface'
import type { ArtboardOctopusData, RgbaColor } from '../types/octopus.type'

export class Artboard implements IArtboard {
  readonly id: ArtboardId
  readonly pageId: PageId | null
  readonly name: string | null
  readonly octopus: ArtboardOctopusData

  private _file: IFile | null

  constructor(
    id: ArtboardId,
    artboardOctopus: ArtboardOctopusData,
    params: Partial<{
      pageId: PageId | null
      name: string | null
      file: IFile | null
    }> = {}
  ) {
    this.id = id
    this.pageId = params.pageId || null
    this.name = params.name || null
    this.octopus = artboardOctopus

    this._file = params.file || null
  }

  getFile(): IFile | null {
    return this._file
  }

  getRootLayers = memoize(
    (): ILayerCollection => {
      const layerDataList = this.octopus['layers'] || []
      const layerList = createLayers(layerDataList, { artboard: this })

      return new LayerCollection(layerList)
    }
  )

  getFlattenedLayers = memoize(
    (options: Partial<{ depth: number }> = {}): ILayerCollection => {
      const layerDataList = this.octopus['layers'] || []
      const depth = options.depth || Infinity
      const layerList = createFlattenedLayers(layerDataList, {
        artboard: this,
        depth,
      })

      return new LayerCollection(layerList)
    },
    2
  )

  getLayerById(layerId: LayerId): ILayer | null {
    return this.getFlattenedLayers().getLayerById(layerId)
  }

  isComponent(): boolean {
    return Boolean(this.octopus['symbolID'])
  }
}
