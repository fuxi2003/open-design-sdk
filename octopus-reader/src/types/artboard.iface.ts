import type { IFile } from './file.iface'
import type { ArtboardOctopusData, RgbaColor } from './octopus.type'

export interface IArtboard {
  readonly id: ArtboardId
  readonly pageId: PageId | null
  readonly name: string | null
  readonly octopus: ArtboardOctopusData

  getFile(): IFile | null

  isComponent(): boolean
}
