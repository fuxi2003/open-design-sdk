import type {
  AggregatedFileBitmapAssetDescriptor,
  AggregatedFileFontDescriptor,
  ArtboardId,
  ArtboardManifestData,
  ArtboardOctopusData,
  ComponentId,
  LayerId,
  LayerSelector,
  PageId,
  RgbaColor,
} from '@opendesign/octopus-reader'
import type { LayerBounds } from '@opendesign/rendering'
import type { IDesignFacade } from './design-facade.iface'
import type { IDesignLayerCollectionFacade } from './design-layer-collection-facade.iface'
import type { ILayerFacade } from './layer-facade.iface'
import type { IPageFacade } from './page-facade.iface'

export interface IArtboardFacade {
  readonly id: ArtboardId

  readonly pageId: PageId | null
  readonly componentId: ComponentId | null
  readonly name: string | null

  getManifest(): ArtboardManifestData
  setManifest(nextManifest: ArtboardManifestData): void

  isLoaded(): boolean
  getContent(): Promise<ArtboardOctopusData>

  getDesign(): IDesignFacade | null

  getPage(): IPageFacade | null
  setPage(nextPageId: PageId | null, params: { name?: string | null }): void
  unassignFromPage(): void

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Promise<Array<AggregatedFileBitmapAssetDescriptor>>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Promise<Array<AggregatedFileFontDescriptor>>

  getBackgroundColor(): Promise<RgbaColor | null>

  getRootLayers(): Promise<IDesignLayerCollectionFacade>
  getFlattenedLayers(
    options?: Partial<{ depth: number }>
  ): Promise<IDesignLayerCollectionFacade>

  getLayerById(layerId: LayerId): Promise<ILayerFacade | null>
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<ILayerFacade | null>

  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<IDesignLayerCollectionFacade>

  getLayerDepth(layerId: LayerId): Promise<number | null>

  isComponent(): boolean

  renderToFile(filePath: string): Promise<void>

  renderLayerToFile(layerId: LayerId, filePath: string): Promise<void>

  renderLayersToFile(layerIds: Array<LayerId>, filePath: string): Promise<void>

  getLayerBounds(layerId: LayerId): Promise<LayerBounds>
}
