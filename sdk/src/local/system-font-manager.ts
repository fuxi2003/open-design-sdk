import { create as createFontkit, Fontkit } from '@avocode/fontkit'
import SystemFontFamilies from '@avocode/system-font-families'
import { extname } from 'path'
import { readFile } from 'fs'
import { promisify } from 'util'

const readFilePromised = promisify(readFile)

export class SystemFontManager {
  // NOTE: Record<postscriptName, filename>
  _systemFonts: Record<string, string> | null = null

  _systemFontFamilies: SystemFontFamilies
  _fontkit: Fontkit

  constructor() {
    this._systemFontFamilies = new SystemFontFamilies()
    this._fontkit = createFontkit()
  }

  async getSystemFontPath(postscriptName: string): Promise<string | null> {
    const systemFonts = await this._loadSystemFontLocations()

    return systemFonts[postscriptName] || null
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
      console.debug('SystemFontManager: no collection fonts', err)
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
