import { File } from './nodes/file'

import type { IFile } from './types/file.iface'
import type { ManifestData } from './types/manifest.type'

export function createEmptyFile(): IFile {
  return new File()
}

export function createFileFromManifest(manifest: ManifestData): IFile {
  const file = new File()

  file.setManifest(manifest)

  return file
}
