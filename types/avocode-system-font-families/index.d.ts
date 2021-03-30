declare module '@avocode/system-font-families' {
  class SystemFonts {
    getAllFontFilesSync(): Array<string>
    getFontFilesSync(): Array<string>

    getFontsExtended(): Promise<
      Array<{
        family: string
        systemFont: boolean
        subFamilies: Array<string>
        files: { [subfamilyName: string]: string }
        postscriptNames: { [subfamilyName: string]: string }
      }>
    >
    getFontsExtendedSync(): Array<{
      family: string
      systemFont: boolean
      subFamilies: Array<string>
      files: { [subfamilyName: string]: string }
      postscriptNames: { [subfamilyName: string]: string }
    }>

    getFonts(): Promise<Array<string>>
    getFontsSync(): Array<string>
  }

  export default SystemFonts
}
