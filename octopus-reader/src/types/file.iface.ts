import type { IArtboard } from './artboard.iface'
import type { ArtboardId, LayerId, PageId } from './ids.type'
import type { ArtboardOctopusData } from './octopus.type'

export interface IFile {
  addArtboard(
    artboardId: ArtboardId,
    octopus: ArtboardOctopusData,
    params?: Partial<{
      pageId: PageId | null
      name: string | null
    }>
  ): IArtboard

  removeArtboard(artboardId: ArtboardId): boolean

  getArtboards(): Array<IArtboard>
  getPageArtboards(pageId: PageId): Array<IArtboard>
  getComponentArtboards(): Array<IArtboard>
  getArtboardById(artboardId: ArtboardId): IArtboard | null
  getArtboardByComponentId(
    componentId: ArtboardOctopusData['symbolID']
  ): IArtboard | null
}
