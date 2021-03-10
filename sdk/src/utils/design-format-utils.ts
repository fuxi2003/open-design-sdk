import { components } from 'open-design-api-types'

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
  const [ext] = fileName.match(/\.\w+$/) || []
  return ext ? fileExtensionDesignFormats[ext] || null : null
}
