import { join as joinPaths } from 'path'
import {
  checkFile,
  readJsonFile,
  readFileStream,
  writeJsonFile,
  writeJsonFileStream,
  readFileBlob,
  writeFileBlob,
  copyDirectory,
  moveDirectory,
} from '../utils/fs'

import {
  ARTBOARD_CONTENT_BASENAME,
  ARTBOARD_DIRECTORY_BASENAME,
  BITMAP_ASSET_DIRECTORY_BASENAME,
  MANIFEST_BASENAME,
  PAGE_CONTENT_BASENAME,
  PAGE_DIRECTORY_BASENAME,
  PRERENDERED_BITMAP_ASSET_SUBDIRECTORY_BASENAME,
} from './consts'

import type {
  ArtboardId,
  ArtboardOctopusData,
  ManifestData,
  PageId,
} from '@opendesign/octopus-reader/types'
import type { ILocalDesign, LocalBitmapAssetDescriptor } from './ifaces'
import type { LocalDesignManager } from './local-design-manager'

export class LocalDesign implements ILocalDesign {
  _filename: string

  constructor(init: {
    filename: string
    localDesignManager: LocalDesignManager
  }) {
    const filename = init.filename
    if (!filename) {
      throw new Error('A filename must be specified')
    }

    this._filename = init.filename
  }

  get filename() {
    return this._filename
  }

  async saveAs(nextFilename: string) {
    const prevFilename = this._filename
    await copyDirectory(prevFilename, nextFilename)
    this._filename = nextFilename
  }

  async move(nextFilename: string) {
    const prevFilename = this._filename
    await moveDirectory(prevFilename, nextFilename)
    this._filename = nextFilename
  }

  async getManifest() {
    const manifestFilename = this._getManifestFilename()
    const manifest = (await readJsonFile(manifestFilename)) as ManifestData
    return manifest
  }

  async saveManifest(manifest: ManifestData): Promise<void> {
    const manifestFilename = this._getManifestFilename()
    await writeJsonFile(manifestFilename, manifest)
  }

  async hasArtboardContent(artboardId: ArtboardId) {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    return checkFile(contentFilename)
  }

  async getArtboardContent(artboardId: ArtboardId) {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    const content = (await readJsonFile(contentFilename)) as ArtboardOctopusData
    return content
  }

  async getArtboardContentJsonStream(artboardId: ArtboardId) {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    return readFileStream(contentFilename)
  }

  async saveArtboardContent(
    artboardId: ArtboardId,
    content: ArtboardOctopusData
  ): Promise<void> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    await writeJsonFile(contentFilename, content)
  }

  async saveArtboardContentJsonStream(
    artboardId: ArtboardId,
    contentStream: NodeJS.ReadableStream
  ): Promise<void> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    console.log('save octopus', artboardId, contentFilename)
    await writeJsonFileStream(contentFilename, contentStream)
  }

  async hasPageContent(pageId: PageId) {
    const contentFilename = this._getPageContentFilename(pageId)
    return checkFile(contentFilename)
  }

  async getPageContent(pageId: PageId) {
    const contentFilename = this._getPageContentFilename(pageId)
    const content = (await readJsonFile(contentFilename)) as ArtboardOctopusData
    return content
  }

  async getPageContentJsonStream(pageId: PageId) {
    const contentFilename = this._getPageContentFilename(pageId)
    return readFileStream(contentFilename)
  }

  async savePageContent(
    pageId: PageId,
    content: ArtboardOctopusData
  ): Promise<void> {
    const contentFilename = this._getPageContentFilename(pageId)
    await writeJsonFile(contentFilename, content)
  }

  async savePageContentJsonStream(
    pageId: PageId,
    contentStream: NodeJS.ReadableStream
  ): Promise<void> {
    const contentFilename = this._getPageContentFilename(pageId)
    await writeJsonFileStream(contentFilename, contentStream)
  }

  async hasBitmapAsset(bitmapAssetDesc: LocalBitmapAssetDescriptor) {
    const bitmapAssetFilename = this._getBitmapAssetFilename(bitmapAssetDesc)
    return checkFile(bitmapAssetFilename)
  }

  async getBitmapAssetStream(bitmapAssetDesc: LocalBitmapAssetDescriptor) {
    const bitmapAssetFilename = this._getBitmapAssetFilename(bitmapAssetDesc)
    return readFileStream(bitmapAssetFilename)
  }

  async getBitmapAssetBlob(bitmapAssetDesc: LocalBitmapAssetDescriptor) {
    const bitmapAssetFilename = this._getBitmapAssetFilename(bitmapAssetDesc)
    return readFileBlob(bitmapAssetFilename)
  }

  async saveBitmapAsset(
    bitmapAssetDesc: LocalBitmapAssetDescriptor,
    content: ArtboardOctopusData
  ): Promise<void> {
    const bitmapAssetFilename = this._getBitmapAssetFilename(bitmapAssetDesc)
    await writeJsonFile(bitmapAssetFilename, content)
  }

  async saveBitmapAssetStream(
    bitmapAssetDesc: LocalBitmapAssetDescriptor,
    contentStream: NodeJS.ReadableStream
  ): Promise<void> {
    const bitmapAssetFilename = this._getBitmapAssetFilename(bitmapAssetDesc)
    await writeJsonFileStream(bitmapAssetFilename, contentStream)
  }

  async saveBitmapAssetBlob(
    bitmapAssetDesc: LocalBitmapAssetDescriptor,
    bitmapAssetBlob: Buffer
  ): Promise<void> {
    const bitmapAssetFilename = this._getBitmapAssetFilename(bitmapAssetDesc)
    await writeFileBlob(bitmapAssetFilename, bitmapAssetBlob)
  }

  _getManifestFilename(): string {
    return joinPaths(this._filename, MANIFEST_BASENAME)
  }

  _getArtboardContentFilename(artboardId: ArtboardId): string {
    return joinPaths(
      this._filename,
      ARTBOARD_DIRECTORY_BASENAME,
      artboardId,
      ARTBOARD_CONTENT_BASENAME
    )
  }

  _getPageContentFilename(pageId: PageId): string {
    return joinPaths(
      this._filename,
      PAGE_DIRECTORY_BASENAME,
      pageId,
      PAGE_CONTENT_BASENAME
    )
  }

  _getBitmapAssetFilename(bitmapAssetDesc: LocalBitmapAssetDescriptor): string {
    return bitmapAssetDesc.prerendered
      ? joinPaths(
          this._filename,
          BITMAP_ASSET_DIRECTORY_BASENAME,
          PRERENDERED_BITMAP_ASSET_SUBDIRECTORY_BASENAME,
          bitmapAssetDesc.name
        )
      : joinPaths(
          this._filename,
          BITMAP_ASSET_DIRECTORY_BASENAME,
          bitmapAssetDesc.name
        )
  }
}
