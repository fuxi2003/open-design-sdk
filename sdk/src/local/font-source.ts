import type { SystemFontManager } from './system-font-manager'

export class FontSource {
  _systemFontManager: SystemFontManager

  _fallbackFonts: Array<string>

  constructor(
    systemFontManager: SystemFontManager,
    params: {
      fallbackFonts?: Array<string>
    }
  ) {
    this._systemFontManager = systemFontManager

    this._fallbackFonts = params.fallbackFonts || []
  }

  setFallbackFonts(fallbackFonts: Array<string>) {
    this._fallbackFonts = fallbackFonts
  }

  resolveFontPath(font: string) {
    return this._systemFontManager.resolveFontPath(font, {
      fallbackFonts: this._fallbackFonts,
    })
  }
}
