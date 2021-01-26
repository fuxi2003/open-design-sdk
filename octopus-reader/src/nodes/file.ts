import { Artboard } from './artboard'

import { matchArtboard } from '../utils/artboard-lookup'

import type { IFile } from '../types/file.iface'
import type {
  ArtboardId,
  ComponentId,
  PageId,
} from '../types/ids.type'
import type { IArtboard } from '../types/artboard.iface'
import type { ArtboardOctopusData } from '../types/octopus.type'
import type { ArtboardSelector, LayerSelector } from '../types/selectors.type'

export class File implements IFile {
  private _artboardsById: Record<ArtboardId, IArtboard> = {}
  private _artboardsByComponentId: Record<ComponentId, IArtboard> = {}
  private _artboardsByPageId: Record<PageId, Array<IArtboard>> = {}
  private _artboardList: Array<IArtboard> = []

  addArtboard(
    artboardId: ArtboardId,
    octopus: ArtboardOctopusData,
    params: Partial<{
      pageId: PageId | null
      name: string | null
    }> = {}
  ): Artboard {
    if (this._artboardsById[artboardId]) {
      throw new Error('Duplicate artboard')
    }

    const artboard = new Artboard(artboardId, octopus, {
      ...params,
      file: this,
    })

    this._artboardsById[artboardId] = artboard
    this._artboardList = [...this._artboardList, artboard]

    if (octopus['symbolID']) {
      this._artboardsByComponentId[octopus['symbolID']] = artboard
    }

    if (params.pageId) {
      this._artboardsByPageId[params.pageId] = [
        ...(this._artboardsByPageId[params.pageId] || []),
        artboard,
      ]
    }

    this.getFlattenedLayers.clear()
    this.getComponentArtboards.clear()

    return artboard
  }

  removeArtboard(artboardId: ArtboardId): boolean {
    const {
      [artboardId]: removedArtboard,
      ...remainingArtboards
    } = this._artboardsById
    if (!removedArtboard) {
      return false
    }

    this._artboardsById = remainingArtboards

    const componentId = removedArtboard.octopus['symbolID']
    if (componentId) {
      const {
        [componentId]: removedComponentArtboard,
        ...remainingComponentArtboards
      } = this._artboardsByComponentId
      this._artboardsByComponentId = remainingComponentArtboards
    }

    const index = this._artboardList.findIndex((artboard) => {
      return artboard === removedArtboard
    })
    if (index > -1) {
      this._artboardList = [
        ...this._artboardList.slice(0, index),
        ...this._artboardList.slice(index + 1),
      ]
    }

    const pageId = removedArtboard.pageId
    if (pageId) {
      const pageArtboardList = this._artboardsByPageId[pageId] || []
      const indexInPage = pageArtboardList.findIndex((artboard) => {
        return artboard === removedArtboard
      })
      if (indexInPage > -1) {
        this._artboardsByPageId[pageId] = [
          ...pageArtboardList.slice(0, indexInPage),
          ...pageArtboardList.slice(indexInPage + 1),
        ]
      }
    }

    this.getFlattenedLayers.clear()
    this.getComponentArtboards.clear()

    return true
  }

  getArtboards(): Array<IArtboard> {
    return this._artboardList
  }

  getPageArtboards(pageId: PageId): Array<IArtboard> {
    return this._artboardsByPageId[pageId] || []
  }

  getComponentArtboards = memoize(
    (): Array<IArtboard> => {
      return this._artboardList.filter((artboard) => {
        return artboard.isComponent()
      })
    }
  )

  getArtboardById(artboardId: ArtboardId): IArtboard | null {
    return this._artboardsById[artboardId] || null
  }

  getArtboardByComponentId(componentId: ComponentId): IArtboard | null {
    return this._artboardsByComponentId[componentId] || null
  }

  findArtboard(selector: ArtboardSelector): IArtboard | null {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      return this.getArtboardById(selector['id'])
    }

    for (const artboard of this._artboardList) {
      if (matchArtboard(selector, artboard)) {
        return artboard
      }
    }

    return null
  }

  findArtboards(selector: ArtboardSelector): Array<IArtboard> {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      const artboard = this.getArtboardById(selector['id'])
      return artboard ? [artboard] : []
    }

    return this._artboardList.filter((artboard) => {
      return matchArtboard(selector, artboard)
    })
  }
}
