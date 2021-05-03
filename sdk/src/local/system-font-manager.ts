import createCancelToken, { CancelToken } from '@avocode/cancel-token'
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
  private _destroyTokenController = createCancelToken()

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

  destroy() {
    this._destroyTokenController.cancel()
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
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<{
    fontFilename: string
    fontPostscriptName: string
    fallback: boolean
  } | null> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const fontFamilies = options.fontFamilies || null
    const fontMatch = await this._getMatchingFont(font, fontFamilies, {
      ...options,
      cancelToken,
    })
    if (fontMatch) {
      return { ...fontMatch, fallback: false }
    }

    const fallbackFontMatch = await this._getMatchingFallbackFont({
      ...options,
      cancelToken,
    })
    if (fallbackFontMatch) {
      return { ...fallbackFontMatch, fallback: true }
    }

    return null
  }

  async _getMatchingFont(
    font: string,
    fontFamilies: SystemFontFamilies | null,
    params: {
      cancelToken: CancelToken
    }
  ): Promise<{ fontFilename: string; fontPostscriptName: string } | null> {
    const ext = extname(font)
    if (ext === '.ttf' || ext === '.otf') {
      try {
        const fontFilename = this._resolvePath(font)
        const fontInfo = await getFontInfo(fontFilename)
        params.cancelToken.throwIfCancelled()

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
      fontFamilies,
      params
    )
    return fontFilename ? { fontFilename, fontPostscriptName: font } : null
  }

  _getMatchingFallbackFont(options: {
    fontFamilies?: SystemFontFamilies | null
    fallbackFonts?: Array<string>
    cancelToken: CancelToken
  }) {
    const fallbackFonts = [
      ...(options.fallbackFonts || []),
      ...this._globalFallbackFonts,
    ]

    return mapFind(fallbackFonts, (fallbackFont) => {
      return this._getMatchingFont(fallbackFont, options.fontFamilies || null, {
        cancelToken: options.cancelToken,
      })
    })
  }

  async _getFontPathByPostscriptName(
    postscriptName: string,
    fontFamilies: SystemFontFamilies | null,
    params: {
      cancelToken: CancelToken
    }
  ): Promise<string | null> {
    if (fontFamilies) {
      const customFontFilenames = await this._getFontLocations(
        fontFamilies,
        params
      )
      const customFontFilename = customFontFilenames[postscriptName]
      if (customFontFilename) {
        return customFontFilename
      }
    }

    const systemFontFilenames = await this._loadSystemFontLocations(params)
    return systemFontFilenames[postscriptName] || null
  }

  async _loadSystemFontLocations(params: { cancelToken: CancelToken }) {
    if (this._systemFonts) {
      return this._systemFonts
    }

    const systemFonts = await this._getFontLocations(
      this._systemFontFamilies,
      params
    )
    this._systemFonts = systemFonts

    return systemFonts
  }

  async _getFontLocations(
    fontFamilies: SystemFontFamilies,
    params: {
      cancelToken: CancelToken
    }
  ) {
    return {
      ...(await this._parseRegularFonts(fontFamilies, params)),
      ...(await this._parseFontCollections(fontFamilies, params)),
    }
  }

  async _parseRegularFonts(
    fontFamilies: SystemFontFamilies,
    params: {
      cancelToken: CancelToken
    }
  ) {
    const fontDescs = await fontFamilies.getFontsExtended()
    params.cancelToken.throwIfCancelled()

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

  async _parseFontCollections(
    fontFamilies: SystemFontFamilies,
    params: {
      cancelToken: CancelToken
    }
  ) {
    try {
      const filenames = fontFamilies.getAllFontFilesSync()
      const fontCollectionFilenames = filenames.filter((filename) => {
        const ext = extname(filename).toLowerCase()
        return ext === '.ttc'
      })

      return this._parseCollectionFontFiles(fontCollectionFilenames, params)
    } catch (err) {
      return {}
    }
  }

  async _parseCollectionFontFiles(
    fontCollectionFilenames: Array<string>,
    params: {
      cancelToken: CancelToken
    }
  ) {
    const filenames: Record<string, string> = {}

    await Promise.all(
      fontCollectionFilenames.map(async (fontCollectionFilename) => {
        const fontData = await readFilePromised(fontCollectionFilename)
        params.cancelToken.throwIfCancelled()

        const fontCollection = await this._fontkit.create(fontData)
        params.cancelToken.throwIfCancelled()

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
