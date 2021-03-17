import type {
  AggregatedFileBitmapAssetDescriptor,
  AggregatedFileFontDescriptor,
  ArtboardId,
  ArtboardSelector,
  ComponentId,
  LayerId,
  LayerSelector,
  PageId,
} from '@opendesign/octopus-reader'
import type { DesignLayerDescriptor } from '../design-layer-collection-facade'
import type { IArtboardFacade } from './artboard-facade.iface'
import type { IDesignLayerCollectionFacade } from './design-layer-collection-facade.iface'

export interface IPageFacade {
  readonly id: PageId

  readonly name: string | null

  getArtboards(): Array<IArtboardFacade>
  getComponentArtboards(): Array<IArtboardFacade>
  getArtboardById(artboardId: ArtboardId): IArtboardFacade | null
  getArtboardByComponentId(componentId: ComponentId): IArtboardFacade | null
  findArtboard(selector: ArtboardSelector): IArtboardFacade | null
  findArtboards(selector: ArtboardSelector): Array<IArtboardFacade>

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Promise<Array<AggregatedFileBitmapAssetDescriptor>>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Promise<Array<AggregatedFileFontDescriptor>>

  getFlattenedLayers(): Promise<IDesignLayerCollectionFacade>

  findLayerById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): Promise<DesignLayerDescriptor | null>
  findLayersById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): Promise<IDesignLayerCollectionFacade>
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<DesignLayerDescriptor | null>
  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<IDesignLayerCollectionFacade>

  renderToFile(relPath: string): Promise<void>
}
