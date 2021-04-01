export interface ILocalDesignCache {
  getWorkingDirectory(): string

  setWorkingDirectory(workingDirectory: string | null): void

  getDesignOctopusFilename(designId: string): Promise<string | null>

  setDesignOctopusFilename(
    designId: string,
    octopusFilename: string
  ): Promise<void>
}
