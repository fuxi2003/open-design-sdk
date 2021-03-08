import { promisify } from 'util'
import * as fs from 'fs'
import mkdirp from 'mkdirp'

import { createTempFileTarget } from './temp-location'

import type {
  ArtboardId,
  ArtboardOctopusData,
  ManifestData,
} from '@opendesign/octopus-reader/types'
import { basename, dirname } from 'path'

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
      'layers': [
        {
          'id': 'xx',
          'name': 'Xx',
          'type': 'layer',
          'bitmap': {
            'filename': 'https://example.com/images/xx.png',
          },
        },
        {
          'id': 'yy',
          'name': 'Yy',
          'type': 'layer',
          'bitmap': {
            'filename': 'https://example.com/images/yy.png',
          },
        },
        // prerendered bitmap
        {
          'id': 'zz',
          'name': 'Zz',
          'type': 'textLayer',
          'text': { 'value': 'Text zzz' },
          'bitmap': {
            'filename': 'https://example.com/images/zz.png',
          },
        },
        // bitmap mask
        {
          'id': 'mm',
          'name': 'Mm',
          'type': 'layer',
          'bitmapMask': {
            'filename': 'https://example.com/images/mask-mm.png',
          },
        },
      ],
    },
  }
  await mkdirp(`${filename}/artboards/a`)
  await writeFile(
    `${filename}/artboards/a/data.json`,
    JSON.stringify(artboardOctopuses['a'])
  )

  const bitmapFilenames: Array<[string, string]> = [
    ['https://example.com/images/xx.png', `${filename}/bitmaps/mapped-xx.png`],
    ['https://example.com/images/yy.png', `${filename}/bitmaps/mapped-yy.png`],
    [
      'https://example.com/images/zz.png',
      `${filename}/bitmaps/prerendered/mapped-zz.png`,
    ],
    [
      'https://example.com/images/mask-mm.png',
      `${filename}/bitmaps/mapped-mask-mm.png`,
    ],
  ]
  const bitmapMapping = Object.fromEntries(
    await Promise.all(
      bitmapFilenames.map(async ([bitmapKey, bitmapFilename]) => {
        const bitmapBasename = basename(bitmapFilename)
        await writeBitmapFile(bitmapFilename)
        return [bitmapKey, bitmapBasename]
      })
    )
  )
  await writeFile(`${filename}/bitmaps.json`, JSON.stringify(bitmapMapping))

  return {
    filename,
    manifest,
    artboardOctopuses,
    bitmapFilenames,
    bitmapMapping,
  }
}

async function writeBitmapFile(filename: string) {
  await mkdirp(dirname(filename))
  await writeFile(filename, 'fake-binary-data png')
}
