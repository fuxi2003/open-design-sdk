import type { IArtboard } from '../types/artboard.iface'
import type { IFile } from '../types/file.iface'
import type { ArtboardId, LayerId, PageId } from '../types/ids.type'
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

  isComponent(): boolean {
    return Boolean(this.octopus['symbolID'])
  }
}
