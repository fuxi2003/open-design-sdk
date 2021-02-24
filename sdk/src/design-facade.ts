import { ArtboardFacade } from './artboard-facade'
import { FileLayerCollectionFacade } from './file-layer-collection-facade'
import { PageFacade } from './page-facade'

import { createEmptyFile } from '../../octopus-reader/src/index'
import { memoize } from '../../octopus-reader/src/utils/memoize'

import type {
  ArtboardId,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  IArtboard,
  IFile,
  IPage,
  LayerId,
  ManifestData,
  PageId,
  PageSelector,
} from '@opendesign/octopus-reader/types'
import type { Sdk } from './sdk'
import type { IDesignFacade } from './types/ifaces'
import type { LayerFacade } from './layer-facade'

export class DesignFacade implements IDesignFacade {
  _sdk: Sdk

  _filename: string | null
  _designEntity: IFile | null = null

  _artboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()
  _pageFacades: Map<PageId, PageFacade> = new Map()

  _manifestLoaded: boolean = false
  _pendingManifestUpdate: ManifestData | null = null

  constructor(params: { sdk: Sdk; filename?: string | null }) {
    this._sdk = params.sdk
    this._filename = params.filename || null
  }

  getManifest(): ManifestData {
    if (this._pendingManifestUpdate) {
      return this._pendingManifestUpdate
    }

    const entity = this.getDesignEntity()
    return entity.getManifest()
  }

  setManifest(nextManifest: ManifestData) {
    this._pendingManifestUpdate = nextManifest
    this._manifestLoaded = true

    this.getDesignEntity.clear()
    this.getArtboards.clear()
    this.getPages.clear()
  }

  getDesignEntity = memoize(() => {
    const entity = this._designEntity || createEmptyFile()

    const pendingManifestUpdate = this._pendingManifestUpdate
    if (pendingManifestUpdate) {
      this._pendingManifestUpdate = null
      entity.setManifest(pendingManifestUpdate)

      this.getArtboards.clear()
      this.getPages.clear()
    }

    return entity
  })

  getArtboards = memoize(() => {
    const prevArtboardFacades = this._artboardFacades
    const nextArtboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()

    const entity = this.getDesignEntity()
    const artboardEntities = entity.getArtboards()

    artboardEntities.forEach((artboardEntity) => {
      const artboardId = artboardEntity.id
      const artboardFacade =
        prevArtboardFacades.get(artboardId) ||
        this._createArtboardFacade(artboardEntity)

      artboardFacade.setArtboardEntity(artboardEntity)

      nextArtboardFacades.set(artboardId, artboardFacade)
    })

    this._artboardFacades = nextArtboardFacades

    return [...nextArtboardFacades.values()]
  })

  getArtboardById(artboardId: ArtboardId): ArtboardFacade | null {
    const prevArtboardFacade = this._artboardFacades.get(artboardId)
    if (prevArtboardFacade) {
      return prevArtboardFacade
    }

    const entity = this.getDesignEntity()
    const artboardEntity = entity.getArtboardById(artboardId)
    if (!artboardEntity) {
      return null
    }

    const artboardFacade = this._createArtboardFacade(artboardEntity)
    artboardFacade.setArtboardEntity(artboardEntity)

    const nextArtboardFacades = new Map(this._artboardFacades.entries())
    nextArtboardFacades.set(artboardId, artboardFacade)

    return artboardFacade
  }

  getPageArtboards(pageId: PageId): Array<ArtboardFacade> {
    const entity = this.getDesignEntity()
    const artboardEntities = entity.getPageArtboards(pageId)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  getComponentArtboards(): Array<ArtboardFacade> {
    const entity = this.getDesignEntity()
    const artboardEntities = entity.getComponentArtboards()

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  getArtboardByComponentId(componentId: ComponentId): ArtboardFacade | null {
    const entity = this.getDesignEntity()
    const artboardEntity = entity.getArtboardByComponentId(componentId)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  isPaged() {
    const entity = this.getDesignEntity()
    return entity.isPaged()
  }

  getPages = memoize(() => {
    const prevPageFacades = this._pageFacades
    const nextPageFacades: Map<PageId, PageFacade> = new Map()

    const entity = this.getDesignEntity()
    const pageEntities = entity.getPages()

    pageEntities.forEach((pageEntity) => {
      const pageId = pageEntity.id
      const pageFacade =
        prevPageFacades.get(pageId) || this._createPageFacade(pageEntity)

      pageFacade.setPageEntity(pageEntity)

      nextPageFacades.set(pageId, pageFacade)
    })

    this._pageFacades = nextPageFacades

    return [...nextPageFacades.values()]
  })

  getPageById(pageId: PageId): PageFacade | null {
    const prevPageFacade = this._pageFacades.get(pageId)
    if (prevPageFacade) {
      return prevPageFacade
    }

    const entity = this.getDesignEntity()
    const pageEntity = entity.getPageById(pageId)
    if (!pageEntity) {
      return null
    }

    const pageFacade = this._createPageFacade(pageEntity)
    pageFacade.setPageEntity(pageEntity)

    const nextPageFacades = new Map(this._pageFacades.entries())
    nextPageFacades.set(pageId, pageFacade)

    return pageFacade
  }

  _createArtboardFacade(artboardEntity: IArtboard): ArtboardFacade {
    const artboard = new ArtboardFacade(artboardEntity, { designFacade: this })
    return artboard
  }

  _createPageFacade(pageEntity: IPage): PageFacade {
    const page = new PageFacade(pageEntity, { designFacade: this })
    return page
  }

  findArtboard(selector: ArtboardSelector): ArtboardFacade | null {
    const entity = this.getDesignEntity()
    const artboardEntity = entity.findArtboard(selector)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  findArtboards(selector: ArtboardSelector): Array<ArtboardFacade> {
    const entity = this.getDesignEntity()
    const artboardEntities = entity.findArtboards(selector)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  findPage(selector: PageSelector): PageFacade | null {
    const entity = this.getDesignEntity()
    const pageEntity = entity.findPage(selector)

    return pageEntity ? this.getPageById(pageEntity.id) : null
  }

  findPages(selector: PageSelector): Array<PageFacade> {
    const entity = this.getDesignEntity()
    const pageEntities = entity.findPages(selector)

    return pageEntities
      .map((pageEntity) => {
        return this.getPageById(pageEntity.id)
      })
      .filter(Boolean) as Array<PageFacade>
  }

  getFlattenedLayers(options: Partial<{ depth: number }> = {}) {
    const entity = this.getDesignEntity()
    const layerCollection = entity.getFlattenedLayers(options)

    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  findLayerById(layerId: LayerId) {
    const entity = this.getDesignEntity()
    const layerEntityDesc = entity.findLayerById(layerId)
    if (!layerEntityDesc) {
      return null
    }

    const layerFacade = this.getArtboardLayer(
      layerEntityDesc.artboardId,
      layerEntityDesc.layer.id
    )

    return layerFacade
      ? {
          artboardId: layerEntityDesc.artboardId,
          layer: layerFacade,
        }
      : null
  }

  findLayersById(layerId: LayerId) {
    const entity = this.getDesignEntity()
    const layerCollection = entity.findLayersById(layerId)

    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  findLayer(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    const entity = this.getDesignEntity()
    const layerEntityDesc = entity.findLayer(selector, options)
    if (!layerEntityDesc) {
      return null
    }

    const layerFacade = this.getArtboardLayer(
      layerEntityDesc.artboardId,
      layerEntityDesc.layer.id
    )

    return layerFacade
      ? {
          artboardId: layerEntityDesc.artboardId,
          layer: layerFacade,
        }
      : null
  }

  findLayers(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    const entity = this.getDesignEntity()
    const layerCollection = entity.findLayers(selector, options)

    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    const entity = this.getDesignEntity()
    return entity.getBitmapAssets(options)
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedFileFontDescriptor> {
    const entity = this.getDesignEntity()
    return entity.getFonts(options)
  }

  getArtboardLayer(
    artboardId: ArtboardId,
    layerId: LayerId
  ): LayerFacade | null {
    const artboardFacade = this.getArtboardById(artboardId)
    return artboardFacade ? artboardFacade.getLayerById(layerId) : null
  }
}