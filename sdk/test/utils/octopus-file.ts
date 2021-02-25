import { promisify } from 'util'
import * as fs from 'fs'
import mkdirp from 'mkdirp'

import { createTempFileTarget } from './temp-location'

import type {
  ArtboardId,
  ArtboardOctopusData,
  ManifestData,
} from '@opendesign/octopus-reader/types'

const writeFile = promisify(fs.writeFile)

export async function createOctopusFile(relPath: string) {
  const filename = await createTempFileTarget(relPath)
  await mkdirp(filename)

  const manifest: ManifestData = {
    'artboards': [
      {
        'artboard_original_id': 'a',
        'artboard_name': 'A',
        'failed': false,
        'url': 'https://example.com/octopus-a.json',
        'preview_url': null,
        'frame': { 'x': 0, 'y': 10 },
        'is_symbol': false,
      },
    ],
    'pages': null,
  }
  await writeFile(`${filename}/manifest.json`, JSON.stringify(manifest))

  const artboardOctopuses: Record<ArtboardId, ArtboardOctopusData> = {
    'a': {
      'frame': { 'x': 0, 'y': 10 },
      'layers': [{ 'id': 'xx', 'name': 'Xx', 'type': 'layer' }],
    },
  }
  await mkdirp(`${filename}/artboards/a`)
  await writeFile(
    `${filename}/artboards/a/data.json`,
    JSON.stringify(artboardOctopuses['a'])
  )

  return { filename, manifest, artboardOctopuses }
}
