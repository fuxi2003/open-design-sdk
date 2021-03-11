import { stat } from 'fs'
import { extname, join as joinPaths, resolve as resolvePath } from 'path'
import { promisify } from 'util'
import { writeJsonFile } from '../utils/fs'
import mkdirp from 'mkdirp'
import { v4 as uuid } from 'uuid'

import { LocalDesign } from './local-design'

import { MANIFEST_BASENAME } from './consts'

import type { ManifestData } from '@opendesign/octopus-reader'
import type { ApiDesignInfo } from '../types/local-design.iface'
import type { ILocalDesignManager } from '../types/local-design-manager.iface'

const statPromised = promisify(stat)

export class LocalDesignManager implements ILocalDesignManager {
  private _workingDirectory: string | null = null

  setWorkingDirectory(workingDirectory: string | null) {
    this._workingDirectory = workingDirectory
      ? resolvePath(workingDirectory)
      : null
  }

  resolvePath(relPath: string) {
    return resolvePath(this._workingDirectory || '.', `${relPath}`)
  }

  async openOctopusFile(
    relPath: string,
    options: Partial<{
      apiDesignInfo: ApiDesignInfo | null
    }> = {}
  ): Promise<LocalDesign> {
    const filename = this.resolvePath(relPath)
    this._checkOctopusFileName(filename)

    const fileStatus = await this._checkOctopusFileStatus(filename)
    if (fileStatus === 'missing') {
      throw new Error('No such .octopus file')
    }
    if (fileStatus === 'invalid') {
      throw new Error('The file is not a valid Octopus file')
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
    const filename = this.resolvePath(relPath)
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

  async _checkOctopusFileStatus(
    filename: string
  ): Promise<'valid' | 'invalid' | 'missing'> {
    try {
      const stats = await statPromised(filename)
      return stats.isDirectory() ? 'valid' : 'invalid'
    } catch (err) {
      return 'missing'
    }
  }

  async _checkFilePresence(dirname: string): Promise<void> {
    const stats = await statPromised(dirname)
    if (stats.isDirectory()) {
      throw new Error('The path is not a valid Octopus file')
    }
  }

  async _createTempLocation(): Promise<string> {
    const dirname = this.resolvePath(`./.opendesign/temp/${uuid()}.octopus`)

    await mkdirp(dirname)

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
