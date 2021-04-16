import { relative, resolve as resolvePath } from 'path'
import { checkFile, readJsonFile, writeJsonFile } from '../utils/fs'

const VERSION = 1

type DesignCacheInfo = {
  'version': typeof VERSION
  'design_cache': Record<string, Record<string, string>>
}

export class LocalDesignCache {
  private _workingDirectory: string | null = null
  private _cacheInfo: DesignCacheInfo | null = null

  getWorkingDirectory() {
    return this._workingDirectory || resolvePath('.')
  }

  setWorkingDirectory(workingDirectory: string | null) {
    this._workingDirectory = workingDirectory
      ? resolvePath(workingDirectory)
      : null
  }

  async getDesignOctopusFilename(
    apiRoot: string,
    designId: string
  ): Promise<string | null> {
    const octopusFilenames = await this._loadOctopusFilenames(apiRoot)
    const optimizedFilename = octopusFilenames[designId] || null

    return optimizedFilename ? this._resolvePath(optimizedFilename) : null
  }

  async setDesignOctopusFilename(
    apiRoot: string,
    designId: string,
    octopusFilename: string
  ) {
    const octopusFilenames = await this._loadOctopusFilenames(apiRoot)

    const optimizedFilename = this._getRelativePath(octopusFilename)
    octopusFilenames[designId] = optimizedFilename

    await this._saveOctopusFilenames(apiRoot, octopusFilenames)
  }

  async _loadOctopusFilenames(apiRoot: string) {
    const cacheInfo = await this._loadCacheInfo()
    return cacheInfo['design_cache'][apiRoot] || {}
  }

  async _loadCacheInfo(): Promise<DesignCacheInfo> {
    if (this._cacheInfo) {
      return this._cacheInfo
    }

    const cacheFilename = this._getCacheFilename()
    const cacheExists = await checkFile(cacheFilename)
    const cacheInfoData = cacheExists ? await readJsonFile(cacheFilename) : null

    const cacheInfoCandidate =
      typeof cacheInfoData === 'object' &&
      cacheInfoData &&
      'version' in cacheInfoData
        ? (cacheInfoData as { 'version': unknown })
        : null

    const cacheInfo =
      cacheInfoCandidate && cacheInfoCandidate['version'] === VERSION
        ? (cacheInfoCandidate as DesignCacheInfo)
        : this._createCacheInfo()

    this._cacheInfo = cacheInfo
    return cacheInfo
  }

  async _saveOctopusFilenames(
    apiRoot: string,
    octopusFilenames: Record<string, string>
  ) {
    const prevCacheInfo = this._getCacheInfo()
    const nextCacheInfo = {
      ...prevCacheInfo,
      'design_cache': {
        ...prevCacheInfo['design_cache'],
        [apiRoot]: octopusFilenames,
      },
    }

    const cacheFilename = this._getCacheFilename()
    await writeJsonFile(cacheFilename, nextCacheInfo)
  }

  _getCacheInfo(): DesignCacheInfo {
    if (this._cacheInfo) {
      return this._cacheInfo
    }

    return this._createCacheInfo()
  }

  _createCacheInfo(): DesignCacheInfo {
    return {
      'version': VERSION,
      'design_cache': {},
    }
  }

  _getCacheFilename() {
    return this._resolvePath('./.opendesign/temp/design-cache.json')
  }

  _resolvePath(filePath: string) {
    return resolvePath(this._workingDirectory || '.', `${filePath}`)
  }

  _getRelativePath(filePath: string) {
    return relative(this._resolvePath('.'), this._resolvePath(filePath))
  }
}
