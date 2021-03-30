declare module '@avocode/fontkit' {
  type FontkitTTFFont = {
    postscriptName: string
  }

  type FontkitTrueTypeCollection = {
    fonts: Array<FontkitTTFFont>
    header: {
      version: number
      numFonts: number
    }
  }

  interface Fontkit {
    create(fontData: Buffer): Promise<FontkitTrueTypeCollection>
  }

  function create(): Fontkit
}
