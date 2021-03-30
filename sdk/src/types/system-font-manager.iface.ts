export interface ISystemFontManager {
  getSystemFontPath(postscriptName: string): Promise<string | null>
}
