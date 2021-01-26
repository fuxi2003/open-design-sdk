import { File } from './nodes/file'

import type { IFile } from './types/file.iface'

export function createEmptyFile(): IFile {
  return new File()
}
