import type {
  AggregatedFileBitmapAssetDescriptor,
  ArtboardId,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  LayerId,
  ManifestData,
  PageId,
  PageSelector,
} from '@opendesign/octopus-reader'
import type {
  Bounds,
  LayerAttributesConfig,
  LayerBounds,
} from '@opendesign/rendering'
import type { IArtboardFacade } from './artboard-facade.iface'
import type { IDesignLayerCollectionFacade } from './design-layer-collection-facade.iface'
import type { FontDescriptor, ILayerFacade } from './layer-facade.iface'
import type { IPageFacade } from './page-facade.iface'

export interface IDesignFacade {
  readonly id: string | null
  readonly sourceFilename: string | null
  readonly octopusFilename: string | null

  saveOctopusFile(filePath?: string | null): Promise<void>

  getManifest(): ManifestData
  // setManifest(nextManifest: ManifestData): void

  /** @category Page Lookup */
  isPaged(): boolean
  /** @category Page Lookup */
  getPages(): Array<IPageFacade>
  /** @category Page Lookup */
  getPageById(pageId: PageId): IPageFacade | null
  /** @category Page Lookup */
  findPage(selector: PageSelector): IPageFacade | null
  /** @category Page Lookup */
  findPages(selector: PageSelector): Array<IPageFacade>

  /** @category Artboard Lookup */
  getArtboards(): Array<IArtboardFacade>
  /** @category Artboard Lookup */
  getPageArtboards(pageId: PageId): Array<IArtboardFacade>
  /** @category Artboard Lookup */
  getComponentArtboards(): Array<IArtboardFacade>
  /** @category Artboard Lookup */
  getArtboardById(artboardId: ArtboardId): IArtboardFacade | null
  /** @category Artboard Lookup */
  getArtboardByComponentId(componentId: ComponentId): IArtboardFacade | null
  /** @category Artboard Lookup */
  findArtboard(selector: ArtboardSelector): IArtboardFacade | null
  /** @category Artboard Lookup */
  findArtboards(selector: ArtboardSelector): Array<IArtboardFacade>

  /** @category Layer Lookup */
  getFlattenedLayers(
    options?: Partial<{ depth: number }>
  ): Promise<IDesignLayerCollectionFacade>

  /** @category Layer Lookup */
  findLayerById(layerId: LayerId): Promise<ILayerFacade | null>
  /** @category Layer Lookup */
  findLayersById(layerId: LayerId): Promise<IDesignLayerCollectionFacade>
  /** @category Layer Lookup */
  findLayer(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<ILayerFacade | null>
  /** @category Layer Lookup */
  findLayers(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<IDesignLayerCollectionFacade>

  /** @category Asset */
  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Promise<Array<AggregatedFileBitmapAssetDescriptor>>
  /** @category Asset */
  getFonts(options?: Partial<{ depth: number }>): Promise<Array<FontDescriptor>>

  setFallbackFonts(fallbackFontPostscriptNames: Array<string>): void

  renderArtboardToFile(artboardId: ArtboardId, filePath: string): Promise<void>

  renderPageToFile(pageId: ArtboardId, filePath: string): Promise<void>

  renderArtboardLayerToFile(
    artboardId: ArtboardId,
    layerId: LayerId,
    filePath: string,
    options?: LayerAttributesConfig & {
      bounds?: Bounds
      scale?: number
    }
  ): Promise<void>

  renderArtboardLayersToFile(
    artboardId: ArtboardId,
    layerIds: Array<LayerId>,
    filePath: string,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>

  getArtboardLayerBounds(
    artboardId: ArtboardId,
    layerId: LayerId
  ): Promise<LayerBounds>

  getArtboardLayerAtPosition(
    artboardId: ArtboardId,
    x: number,
    y: number
  ): Promise<ILayerFacade | null>

  getArtboardLayersInArea(
    artboardId: ArtboardId,
    bounds: Bounds,
    options?: { partialOverlap?: boolean }
  ): Promise<Array<ILayerFacade>>
}
