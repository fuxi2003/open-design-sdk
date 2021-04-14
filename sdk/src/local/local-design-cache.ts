import { relative, resolve as resolvePath } from 'path'
import { checkFile, readJsonFile, writeJsonFile } from '../utils/fs'

export class LocalDesignCache {
  private _workingDirectory: string | null = null
  private _designOctopusFilenames: Record<string, string> | null = null

  getWorkingDirectory() {
    return this._workingDirectory || resolvePath('.')
  }

  setWorkingDirectory(workingDirectory: string | null) {
    this._workingDirectory = workingDirectory
      ? resolvePath(workingDirectory)
      : null
  }

  async getDesignOctopusFilename(designId: string): Promise<string | null> {
    const octopusFilenames = await this._loadOctopusFilenames()
    const optimizedFilename = octopusFilenames[designId] || null

    return optimizedFilename ? this._resolvePath(optimizedFilename) : null
  }

  async setDesignOctopusFilename(designId: string, octopusFilename: string) {
    const octopusFilenames = await this._loadOctopusFilenames()

    const optimizedFilename = this._getRelativePath(octopusFilename)
    octopusFilenames[designId] = optimizedFilename

    await this._saveOctopusFilenames(octopusFilenames)
  }

  async _loadOctopusFilenames() {
    if (this._designOctopusFilenames) {
      return this._designOctopusFilenames
    }

    const cacheFilename = this._getCacheFilename()
    const cacheExists = await checkFile(cacheFilename)

    const octopusFilenames = cacheExists
      ? ((await readJsonFile(cacheFilename)) as Record<string, string>)
      : {}

    this._designOctopusFilenames = octopusFilenames

    return octopusFilenames
  }

  async _saveOctopusFilenames(octopusFilenames: Record<string, string>) {
    const cacheFilename = this._getCacheFilename()
    await writeJsonFile(cacheFilename, octopusFilenames)
  }

  _getCacheFilename() {
    return this._resolvePath('./.opendesign/temp/designs.json')
  }

  _resolvePath(filePath: string) {
    return resolvePath(this._workingDirectory || '.', `${filePath}`)
  }

  _getRelativePath(filePath: string) {
    return relative(this._resolvePath('.'), this._resolvePath(filePath))
  }
}
