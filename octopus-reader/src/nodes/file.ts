import { Artboard } from './artboard'
import { FileData } from '../data/file-data'
import { FileLayerCollection } from '../collections/file-layer-collection'

import {
  findLayer,
  findLayerById,
  findLayers,
  findLayersById,
  getBitmapAssets,
  getFlattenedLayers,
  getFonts,
} from '../utils/aggregation'
import { matchArtboard } from '../utils/artboard-lookup'
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
  private _fileData = new FileData(this)

  getManifest(): ManifestData {
    return this._fileData.getManifest()
  }

  setManifest(nextManifest: ManifestData) {
    this._fileData.setManifest(nextManifest)
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
    return this._fileData.addArtboard(artboardId, octopus, params)
  }

  removeArtboard(artboardId: ArtboardId): boolean {
    return this._fileData.removeArtboard(artboardId)
  }

  getArtboards(): Array<IArtboard> {
    return this._fileData.getArtboardList()
  }

  getPageArtboards(pageId: PageId): Array<IArtboard> {
    return this._fileData.getPageArtboards(pageId)
  }

  getComponentArtboards(): Array<IArtboard> {
    return this._fileData.getComponentArtboards()
  }

  getArtboardById(artboardId: ArtboardId): IArtboard | null {
    const artboardsById = this._fileData.getArtboardMap()
    return artboardsById[artboardId] || null
  }

  getArtboardByComponentId(componentId: ComponentId): IArtboard | null {
    const artboardsByComponentId = this._fileData.getComponentArtboardMap()
    return artboardsByComponentId[componentId] || null
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

    for (const artboard of this.getArtboards()) {
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

    return this.getArtboards().filter((artboard) => {
      return matchArtboard(selector, artboard)
    })
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    return getBitmapAssets(this.getArtboards(), options)
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedFileFontDescriptor> {
    return getFonts(this.getArtboards(), options)
  }

  getFlattenedLayers(
    options: Partial<{ depth: number }> = {}
  ): FileLayerCollection {
    const layers = getFlattenedLayers(this.getArtboards(), options)

    return new FileLayerCollection(layers, this)
  }

  findLayerById(layerId: LayerId): FileLayerDescriptor | null {
    return findLayerById(this.getArtboards(), layerId)
  }

  findLayersById(layerId: LayerId): FileLayerCollection {
    const layers = findLayersById(this.getArtboards(), layerId)

    return new FileLayerCollection(layers, this)
  }

  findLayer(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): FileLayerDescriptor | null {
    return findLayer(this.getArtboards(), selector, options)
  }

  findLayers(
    selector: LayerSelector,
    options: Partial<{ depth: number }> = {}
  ): FileLayerCollection {
    const layers = findLayers(this.getArtboards(), selector, options)

    return new FileLayerCollection(layers, this)
  }
}
