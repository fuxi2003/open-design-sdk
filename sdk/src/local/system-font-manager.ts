import { create as createFontkit, Fontkit } from '@avocode/fontkit'
import SystemFontFamilies, { getFontInfo } from '@avocode/system-font-families'
import { extname, resolve as resolvePath } from 'path'
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
  private _workingDirectory: string | null = null

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

  getWorkingDirectory() {
    return this._workingDirectory || resolvePath('.')
  }

  setWorkingDirectory(workingDirectory: string | null) {
    this._workingDirectory = workingDirectory
      ? resolvePath(workingDirectory)
      : null
  }

  setGlobalFallbackFonts(fallbackFonts: Array<string>) {
    this._globalFallbackFonts = fallbackFonts
  }

  createFontSource(
    params: {
      fontDirname?: string | null
      fallbackFonts?: Array<string>
    } = {}
  ) {
    return new FontSource(this, params)
  }

  getFontFamilies(fontDirname: string): SystemFontFamilies {
    return new SystemFontFamilies({
      customDirs: [fontDirname],
      ignoreSystemFonts: true,
    })
  }

  async resolveFontPath(
    font: string,
    options: {
      fontFamilies?: SystemFontFamilies | null
      fallbackFonts?: Array<string>
    } = {}
  ): Promise<{
    fontFilename: string
    fontPostscriptName: string
    fallback: boolean
  } | null> {
    const fontFamilies = options.fontFamilies || null
    const fontMatch = await this._getMatchingFont(font, fontFamilies)
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
    font: string,
    fontFamilies: SystemFontFamilies | null
  ): Promise<{ fontFilename: string; fontPostscriptName: string } | null> {
    const ext = extname(font)
    if (ext === '.ttf' || ext === '.otf') {
      try {
        const fontFilename = this._resolvePath(font)
        const fontInfo = await getFontInfo(fontFilename)
        if (fontInfo) {
          return { fontFilename, fontPostscriptName: fontInfo.postscript }
        }
      } catch (err) {
        this._console.warn(
          'Font file path not resolved as a font file',
          font,
          err
        )
      }
    }
    if (ext === '.ttc') {
      console.error(
        'TrueTypeCollection (.ttc) font files cannot be used directly',
        font
      )
    }

    const fontFilename = await this._getFontPathByPostscriptName(
      font,
      fontFamilies
    )
    return fontFilename ? { fontFilename, fontPostscriptName: font } : null
  }

  _getMatchingFallbackFont(options: {
    fontFamilies?: SystemFontFamilies | null
    fallbackFonts?: Array<string>
  }) {
    const fallbackFonts = [
      ...(options.fallbackFonts || []),
      ...this._globalFallbackFonts,
    ]

    return mapFind(fallbackFonts, (fallbackFont) => {
      return this._getMatchingFont(fallbackFont, options.fontFamilies || null)
    })
  }

  async _getFontPathByPostscriptName(
    postscriptName: string,
    fontFamilies: SystemFontFamilies | null
  ): Promise<string | null> {
    if (fontFamilies) {
      const customFontFilenames = await this._getFontLocations(fontFamilies)
      const customFontFilename = customFontFilenames[postscriptName]
      if (customFontFilename) {
        return customFontFilename
      }
    }

    const systemFontFilenames = await this._loadSystemFontLocations()
    return systemFontFilenames[postscriptName] || null
  }

  async _loadSystemFontLocations() {
    if (this._systemFonts) {
      return this._systemFonts
    }

    const systemFonts = await this._getFontLocations(this._systemFontFamilies)
    this._systemFonts = systemFonts

    return systemFonts
  }

  async _getFontLocations(fontFamilies: SystemFontFamilies) {
    return {
      ...(await this._parseRegularFonts(fontFamilies)),
      ...(await this._parseFontCollections(fontFamilies)),
    }
  }

  async _parseRegularFonts(fontFamilies: SystemFontFamilies) {
    const fontDescs = await fontFamilies.getFontsExtended()
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

  async _parseFontCollections(fontFamilies: SystemFontFamilies) {
    try {
      const filenames = fontFamilies.getAllFontFilesSync()
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

  _resolvePath(filePath: string) {
    return resolvePath(this._workingDirectory || '.', `${filePath}`)
  }
}
