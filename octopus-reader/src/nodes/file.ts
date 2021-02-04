import { Artboard } from './artboard'
import { FileLayerCollection } from '../collections/file-layer-collection'

import { matchArtboard } from '../utils/artboard-lookup'
import {
  keepUniqueFileBitmapAssetDescriptors,
  keepUniqueFileFontDescriptors,
} from '../utils/assets'
import { memoize } from '../utils/memoize'

import type { IFile } from '../types/file.iface'
import type {
  ArtboardId,
  ComponentId,
  LayerId,
  PageId,
} from '../types/ids.type'
import type { IArtboard } from '../types/artboard.iface'
import type { ArtboardOctopusData } from '../types/octopus.type'
import type { ArtboardSelector, LayerSelector } from '../types/selectors.type'
import type { AggregatedFileBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { AggregatedFileFontDescriptor } from '../types/fonts.type'
import type { FileLayerDescriptor } from '../types/file-layer-collection.iface'
import type { ArtboardManifestData, ManifestData } from '../types/manifest.type'

export class File implements IFile {
  private _artboardsById: Record<ArtboardId, IArtboard> = {}
  private _artboardsByComponentId: Record<ComponentId, IArtboard> = {}
  private _artboardsByPageId: Record<PageId, Array<IArtboard>> = {}
  private _artboardList: Array<IArtboard> = []

  private _pageNames: Record<string, string> | null = null

  getManifest = memoize(() => {
    return {
      'artboards': this._artboardList.map((artboard) => {
        return artboard.getManifest()
      }),
      'pages': this._pageNames,
    }
  })

  setManifest(nextManifest: ManifestData) {
    this._pageNames = nextManifest['pages'] || null

    nextManifest['artboards'].forEach((nextArtboardManifest) => {
      const artboardId = nextArtboardManifest['artboard_original_id']
      const artboard = this.getArtboardById(artboardId)

      if (artboard) {
        artboard.setManifest(nextArtboardManifest)
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
    if (this._artboardsById[artboardId]) {
      throw new Error('Duplicate artboard')
    }

    const artboard = new Artboard(artboardId, octopus, {
      ...params,
      file: this,
    })

    this._artboardsById[artboardId] = artboard
    this._artboardList = [...this._artboardList, artboard]

    const componentId = artboard.componentId
    if (componentId) {
      this._artboardsByComponentId[componentId] = artboard
    }

    const pageId = artboard.pageId
    if (pageId) {
      this._artboardsByPageId[pageId] = [
        ...(this._artboardsByPageId[pageId] || []),
        artboard,
      ]
    }

    this.getManifest.clear()
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

    const componentId = removedArtboard.componentId
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

    this.getManifest.clear()
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

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    return keepUniqueFileBitmapAssetDescriptors(
      this._artboardList.flatMap((artboard) => {
        return artboard.getBitmapAssets(options).map((assetDesc) => {
          const { layerIds, ...data } = assetDesc
          return { ...data, artboardLayerIds: { [artboard.id]: layerIds } }
        })
      })
    )
  }

  getFonts(
    options: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor> {
    return keepUniqueFileFontDescriptors(
      this._artboardList.flatMap((artboard) => {
        return artboard.getFonts(options).map((assetDesc) => {
          const { layerIds, ...data } = assetDesc
          return { ...data, artboardLayerIds: { [artboard.id]: layerIds } }
        })
      })
    )
  }

  getFlattenedLayers = memoize(
    (options: Partial<{ depth: number }> = {}): FileLayerCollection => {
      return new FileLayerCollection(
        this.getArtboards().flatMap((artboard) => {
          return artboard.getFlattenedLayers(options).map((layer) => {
            return { artboardId: artboard.id, layer }
          })
        }),
        this
      )
    }
  )

  findLayerById(layerId: LayerId): FileLayerDescriptor | null {
    for (const artboard of this._artboardList) {
      const layer = artboard.getLayerById(layerId)
      if (layer) {
        return { artboardId: artboard.id, layer }
      }
    }

    return null
  }

  findLayersById(layerId: LayerId): FileLayerCollection {
    const layers = this._artboardList.flatMap((artboard) => {
      const layer = artboard.getLayerById(layerId)
      return layer ? [{ artboardId: artboard.id, layer }] : []
    })

    return new FileLayerCollection(layers, this)
  }

  findLayer(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): FileLayerDescriptor | null {
    const depthWithinArtboard = options.depth || Infinity

    for (const artboard of this._artboardList) {
      const layer = artboard.findLayer(selector, { depth: depthWithinArtboard })
      if (layer) {
        return { artboardId: artboard.id, layer }
      }
    }

    return null
  }

  findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): FileLayerCollection {
    const depthWithinArtboard = options.depth || Infinity

    const layers = this._artboardList.flatMap((artboard) => {
      return artboard
        .findLayers(selector, { depth: depthWithinArtboard })
        .map((layer) => {
          return { artboardId: artboard.id, layer }
        })
    })

    return new FileLayerCollection(layers, this)
  }
}
