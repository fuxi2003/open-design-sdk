import type { ManifestData } from '@opendesign/octopus-reader'
import type { ILocalDesign } from './local-design.iface'

export interface ILocalDesignManager {
  openOctopusFile(filename: string): Promise<ILocalDesign>
  createOctopusFileFromManifest(manifest: ManifestData): Promise<ILocalDesign>
}
