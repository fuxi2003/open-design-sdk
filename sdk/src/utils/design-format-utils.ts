import { components } from 'open-design-api-types'
import * as path from 'path'

type Design = components['schemas']['Design']

const fileExtensionDesignFormats: { [ext: string]: Design['format'] } = {
  '.psd': 'photoshop',
  '.psb': 'photoshop',
  '.sketch': 'sketch',
  '.xd': 'xd',
  '.ai': 'illustrator',
}

export function getDesignFormatByFileName(
  fileName: string
): Design['format'] | null {
  const ext = path.extname(fileName)
  return fileExtensionDesignFormats[ext] || null
}
