import { create as createFontkit, Fontkit } from '@avocode/fontkit'
import SystemFontFamilies from '@avocode/system-font-families'
import { extname } from 'path'
import { readFile } from 'fs'
import { promisify } from 'util'
import { FontSource } from './font-source'
import { mapFind } from '../utils/async'

const readFilePromised = promisify(readFile)

export type FontMatchDescriptor = {
  fontFilename: string
  fontPostscriptName: string
  fallback: boolean
}

export class SystemFontManager {
  // NOTE: Record<postscriptName, filename>
  _systemFonts: Record<string, string> | null = null

  _console: Console
  _systemFontFamilies: SystemFontFamilies
  _fontkit: Fontkit

  private _globalFallbackFonts: Array<string> = [
    'Roboto',
    'Helvetica',
    'Arial',
    'Courier',
  ]

  constructor(params: { console?: Console | null } = {}) {
    this._console = params.console || console

    this._systemFontFamilies = new SystemFontFamilies()
    this._fontkit = createFontkit()
  }

  setGlobalFallbackFonts(fallbackFonts: Array<string>) {
    this._globalFallbackFonts = fallbackFonts
  }

  createFontSource(
    params: {
      fallbackFonts?: Array<string>
    } = {}
  ) {
    return new FontSource(this, params)
  }

  async resolveFontPath(
    font: string,
    options: {
      fallbackFonts?: Array<string>
    } = {}
  ): Promise<{
    fontFilename: string
    fontPostscriptName: string
    fallback: boolean
  } | null> {
    const fontMatch = await this._getMatchingFont(font)
    if (fontMatch) {
      return { ...fontMatch, fallback: false }
    }

    const fallbackFontMatch = await this._getMatchingFallbackFont(options)
    if (fallbackFontMatch) {
      return { ...fallbackFontMatch, fallback: true }
    }

    return null
  }

  async _getMatchingFont(
    font: string
  ): Promise<{ fontFilename: string; fontPostscriptName: string } | null> {
    const fontFilename = await this._getFontPathByPostscriptName(font)
    return fontFilename ? { fontFilename, fontPostscriptName: font } : null
  }

  _getMatchingFallbackFont(options: { fallbackFonts?: Array<string> }) {
    const fallbackFonts = [
      ...(options.fallbackFonts || []),
      ...this._globalFallbackFonts,
    ]

    return mapFind(fallbackFonts, (fallbackFont) => {
      return this._getMatchingFont(fallbackFont)
    })
  }

  async _getFontPathByPostscriptName(
    postscriptName: string
  ): Promise<string | null> {
    const systemFontFilenames = await this._loadSystemFontLocations()
    return systemFontFilenames[postscriptName] || null
  }

  async _loadSystemFontLocations() {
    if (this._systemFonts) {
      return this._systemFonts
    }

    const systemFonts = {
      ...(await this._parseRegularSystemFonts()),
      ...(await this._parseSystemFontCollections()),
    }
    this._systemFonts = systemFonts

    return systemFonts
  }

  async _parseRegularSystemFonts() {
    const fontDescs = await this._systemFontFamilies.getFontsExtended()
    const supportedFormats = ['.otf', '.ttf']

    const filenames: Record<string, string> = {}

    fontDescs.forEach((fontDesc) => {
      fontDesc.subFamilies.map((subFamilyName) => {
        const postscriptName = fontDesc.postscriptNames[subFamilyName]
        const filename = fontDesc.files[subFamilyName]
        const ext = filename ? extname(filename) : ''

        if (postscriptName && filename && supportedFormats.includes(ext)) {
          filenames[postscriptName] = filename
        }
      })
    })

    return filenames
  }

  async _parseSystemFontCollections() {
    try {
      const filenames = this._systemFontFamilies.getAllFontFilesSync()
      const fontCollectionFilenames = filenames.filter((filename) => {
        const ext = extname(filename).toLowerCase()
        return ext === '.ttc'
      })

      return this._parseCollectionFontFiles(fontCollectionFilenames)
    } catch (err) {
      return {}
    }
  }

  async _parseCollectionFontFiles(fontCollectionFilenames: Array<string>) {
    const filenames: Record<string, string> = {}

    await Promise.all(
      fontCollectionFilenames.map(async (fontCollectionFilename) => {
        const fontData = await readFilePromised(fontCollectionFilename)
        const fontCollection = await this._fontkit.create(fontData)

        fontCollection.fonts.forEach((fontInfo) => {
          const postscriptName = fontInfo.postscriptName
          filenames[postscriptName] = fontCollectionFilename
        })
      })
    )

    return filenames
  }
}
