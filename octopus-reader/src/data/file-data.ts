import { Artboard } from '../nodes/artboard'

import { memoize } from '../utils/memoize'

import type { IArtboard } from '../types/artboard.iface'
import type { IFile } from '../types/file.iface'
import type { ArtboardId, PageId } from '../types/ids.type'
import type { ArtboardManifestData, ManifestData } from '../types/manifest.type'
import type { ArtboardOctopusData, ComponentId } from '../types/octopus.type'

export class FileData {
  private _file: IFile

  private _artboardList: Array<IArtboard> = []

  constructor(file: IFile) {
    this._file = file
  }

  getManifest = memoize(() => {
    return {
      'artboards': this._artboardList.map((artboard) => {
        return artboard.getManifest()
      }),
    }
  })

  setManifest(nextManifest: ManifestData) {
    nextManifest['artboards'].forEach((nextArtboardManifest) => {
      const artboardId = nextArtboardManifest['artboard_original_id']
      const prevArtboard = this.getArtboardById(artboardId)

      if (prevArtboard) {
        prevArtboard.setManifest(nextArtboardManifest)
      } else {
        this.addArtboard(nextArtboardManifest['artboard_original_id'], null, {
          manifest: nextArtboardManifest,
        })
      }
    })
  }

  addArtboard(
    artboardId: ArtboardId,
    octopus: ArtboardOctopusData | null,
    params: Partial<{
      manifest: ArtboardManifestData
      pageId: PageId | null
      componentId: ComponentId | null
      name: string | null
    }> = {}
  ): Artboard {
    const index = this._artboardList.findIndex(
      (artboard) => artboard.id === artboardId
    )
    if (index > -1) {
      throw new Error('Duplicate artboard')
    }

    const artboard = new Artboard(artboardId, octopus, {
      ...params,
      file: this._file,
    })
    this._replaceArtboardList((prevArtboardList) => {
      return [...prevArtboardList, artboard]
    })

    return artboard
  }

  removeArtboard(artboardId: ArtboardId): boolean {
    return this._replaceArtboardList((artboardList) => {
      const index = artboardList.findIndex(
        (artboard) => artboard.id === artboardId
      )
      const removedArtboard = index > -1 ? artboardList[index] : null
      if (!removedArtboard) {
        return artboardList
      }

      return [...artboardList.slice(0, index), ...artboardList.slice(index + 1)]
    })
  }

  getArtboardList(): Array<IArtboard> {
    return this._artboardList
  }

  getPageArtboards(pageId: PageId): Array<IArtboard> {
    return this._artboardList.filter((artboard) => {
      return artboard.pageId === pageId
    })
  }

  getArtboardById(artboardId: ArtboardId): IArtboard | null {
    const artboardsById = this.getArtboardMap()
    return artboardsById[artboardId] || null
  }

  getArtboardByComponentId(componentId: ComponentId): IArtboard | null {
    const artboardsByComponentId = this.getArtboardMap()
    return artboardsByComponentId[componentId] || null
  }

  getArtboardMap = memoize(() => {
    const artboardsById: Record<ArtboardId, IArtboard> = {}
    this._artboardList.forEach((artboard) => {
      artboardsById[artboard.id] = artboard
    })

    return artboardsById
  })

  getComponentArtboards = memoize(
    (): Array<IArtboard> => {
      return this.getArtboardList().filter((artboard) => {
        return artboard.isComponent()
      })
    }
  )

  getComponentArtboardMap = memoize(() => {
    const artboardsByComponentId: Record<ComponentId, IArtboard> = {}
    this._artboardList.forEach((artboard) => {
      const componentId = artboard.componentId
      if (componentId) {
        artboardsByComponentId[componentId] = artboard
      }
    })

    return artboardsByComponentId
  })

  _replaceArtboardList(
    mapper: (prevArtboardList: Array<IArtboard>) => Array<IArtboard>
  ): boolean {
    const prevArtboardList = this._artboardList
    const nextArtboardList = mapper(prevArtboardList)
    if (prevArtboardList === nextArtboardList) {
      return false
    }

    this._artboardList = nextArtboardList

    this.getArtboardMap.clear()
    this.getComponentArtboards.clear()
    this.getComponentArtboardMap.clear()
    this.getManifest.clear()

    return true
  }
}
