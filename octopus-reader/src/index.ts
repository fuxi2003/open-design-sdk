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

export * from './types/artboard.iface'
export * from './types/bitmap-assets.type'
export * from './types/bitmap.iface'
export * from './types/bitmap-mask.iface'
export * from './types/effects.iface'
export * from './types/file.iface'
export * from './types/fonts.type'
export * from './types/ids.type'
export * from './types/layer-collection.iface'
export * from './types/layer.iface'
export * from './types/manifest.type'
export * from './types/octopus.type'
export * from './types/page.iface'
export * from './types/selectors.type'
export * from './types/shape.iface'
export * from './types/text.iface'
