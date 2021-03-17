export interface IRenderingArtboard {
  readonly id: string
  readonly symbolId: string | null

  readonly ready: boolean
  readonly pendingSymbolIds: Array<string>

  load(params: {
    octopusFilename: string
    bitmapAssetDirectoryPath?: string | null
    fontDirectoryPath?: string | null
  }): Promise<void>
}
