import type { CancelToken } from '@avocode/cancel-token'
import type SystemFontFamilies from '@avocode/system-font-families'
import type { SystemFontManager } from './system-font-manager'

export class FontSource {
  _systemFontManager: SystemFontManager

  _fontDirname: string | null = null
  _fontFamilies: SystemFontFamilies | null = null
  _fallbackFonts: Array<string>

  constructor(
    systemFontManager: SystemFontManager,
    params: {
      fontDirname?: string | null
      fallbackFonts?: Array<string>
    }
  ) {
    this._systemFontManager = systemFontManager

    this._fallbackFonts = params.fallbackFonts || []

    this.setFontDirectory(params.fontDirname || null)
  }

  setFontDirectory(fontDirname: string | null) {
    if (this._fontDirname === fontDirname) {
      return
    }

    this._fontDirname = fontDirname
    this._fontFamilies = fontDirname
      ? this._systemFontManager.getFontFamilies(fontDirname)
      : null
  }

  setFallbackFonts(fallbackFonts: Array<string>) {
    this._fallbackFonts = fallbackFonts
  }

  resolveFontPath(
    font: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    return this._systemFontManager.resolveFontPath(font, {
      fontFamilies: this._fontFamilies,
      fallbackFonts: this._fallbackFonts,
      ...options,
    })
  }
}
