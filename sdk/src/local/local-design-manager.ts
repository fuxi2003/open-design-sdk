import { mkdir, stat } from 'fs'
import { tmpdir } from 'os'
import { extname, join as joinPaths, resolve as resolvePath } from 'path'
import { promisify } from 'util'
import { writeJsonFile } from '../utils/fs'
import mkdirp from 'mkdirp'
import { v4 as uuid } from 'uuid'

import { LocalDesign } from './local-design'

import { MANIFEST_BASENAME } from './consts'

import type { ManifestData } from '@opendesign/octopus-reader/types'
import type { ApiDesignInfo, ILocalDesignManager } from './ifaces'

const statPromised = promisify(stat)
const mkdirPromised = promisify(mkdir)

export class LocalDesignManager implements ILocalDesignManager {
  async openOctopusFile(
    relPath: string,
    options: Partial<{
      apiDesignInfo: ApiDesignInfo | null
    }> = {}
  ): Promise<LocalDesign> {
    const filename = resolvePath(relPath)
    this._checkOctopusFileName(filename)

    if (!(await this._checkDirectoryPresence(filename))) {
      return this.createOctopusFile(filename)
    }

    const manifestFilename = joinPaths(filename, MANIFEST_BASENAME)
    await this._checkFilePresence(manifestFilename)

    const localDesign = new LocalDesign({ filename, localDesignManager: this })
    if (
      options.apiDesignInfo &&
      !(await this._checkApiDesignInfo(localDesign, options.apiDesignInfo))
    ) {
      throw new Error('Incompatible API design entity info')
    }

    return localDesign
  }

  async createOctopusFile(relPath: string): Promise<LocalDesign> {
    const filename = resolvePath(relPath)
    this._checkOctopusFileName(filename)

    await this._createDirectory(filename)

    const emptyManifest = { 'artboards': [], 'pages': {} }
    await writeJsonFile(`${filename}/${MANIFEST_BASENAME}`, emptyManifest)

    return new LocalDesign({ filename, localDesignManager: this })
  }

  async createOctopusFileFromManifest(
    manifest: ManifestData,
    options: Partial<{
      apiDesignInfo: ApiDesignInfo | null
    }> = {}
  ): Promise<LocalDesign> {
    const filename = await this._createTempLocation()
    const localDesign = await this.createOctopusFile(filename)
    console.log('temp octopus file from manifest', filename)

    await localDesign.saveManifest(manifest)

    if (options.apiDesignInfo) {
      await localDesign.saveApiDesignInfo(options.apiDesignInfo)
    }

    return localDesign
  }

  _checkOctopusFileName(filename: string) {
    const ext = extname(filename)
    if (ext !== '.octopus') {
      throw new Error('The file is not a .octopus file')
    }
  }

  async _createDirectory(dirname: string): Promise<void> {
    await mkdirp(dirname)
  }

  async _checkDirectoryPresence(dirname: string): Promise<boolean> {
    try {
      const stats = await statPromised(dirname)
      return stats.isDirectory()
    } catch (err) {
      return false
    }
  }

  async _checkFilePresence(dirname: string): Promise<void> {
    const stats = await statPromised(dirname)
    if (stats.isDirectory()) {
      throw new Error('The path is not a valid Octopus file')
    }
  }

  async _createTempLocation(): Promise<string> {
    const dirname = `${tmpdir()}/opendesignsdk-temp-${uuid()}.octopus`

    await mkdirPromised(dirname)

    return dirname
  }

  async _checkApiDesignInfo(
    localDesign: LocalDesign,
    nextApiDesignInfo: ApiDesignInfo
  ): Promise<boolean> {
    const prevApiDesignInfo = await localDesign.getApiDesignInfo()
    if (!prevApiDesignInfo) {
      return true
    }

    return (
      (!prevApiDesignInfo.apiRoot ||
        prevApiDesignInfo.apiRoot === nextApiDesignInfo.apiRoot) &&
      (!prevApiDesignInfo.designId ||
        !nextApiDesignInfo.designId ||
        prevApiDesignInfo.designId === nextApiDesignInfo.designId)
    )
  }
}
