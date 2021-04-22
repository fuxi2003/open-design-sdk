import type { ReadStream } from 'fs'
import type { ManifestData } from '@opendesign/octopus-reader'
import type { components } from 'open-design-api-types'

type ArtboardId = components['schemas']['ArtboardId']
type DesignData = components['schemas']['Design']
type DesignExportData = components['schemas']['DesignExport']
type DesignExportId = components['schemas']['DesignExportId']
type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']
type DesignSummary = components['schemas']['DesignSummary']
type DesignId = components['schemas']['DesignId']
type DesignImportFormatEnum = components['schemas']['DesignImportFormatEnum']
type OctopusDocument = components['schemas']['OctopusDocument']

// Top-level API

export interface IOpenDesignApiModule {
  createOpenDesignApi(params: { token: string }): IOpenDesignApi
}

export interface IOpenDesignApi {
  getApiRoot(): string

  // Import

  importDesignFile(
    stream: ReadStream,
    options?: { format?: DesignImportFormatEnum }
  ): Promise<IApiDesign>

  importDesignLink(
    url: string,
    options?: { format?: DesignImportFormatEnum }
  ): Promise<IApiDesign>

  importFigmaDesignLink(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string> | null
    name?: string | null
  }): Promise<IApiDesign>

  importFigmaDesignLinkWithExports(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string> | null
    name?: string | null
    exports: Array<{ format: DesignExportTargetFormatEnum }>
  }): Promise<{
    designId: DesignId
    exports: Array<IApiDesignExport>
  }>

  // Designs

  // - Design Structure

  getDesignById(designId: DesignId): Promise<IApiDesign>

  // - Design Contents

  getDesignArtboardContent(
    designId: DesignId,
    artboardId: ArtboardId
  ): Promise<OctopusDocument>

  getDesignArtboardContentJsonStream(
    designId: DesignId,
    artboardId: ArtboardId
  ): Promise<NodeJS.ReadableStream>

  // - Design Exports

  exportDesign(
    designId: DesignId,
    params: { format: DesignExportTargetFormatEnum }
  ): Promise<IApiDesignExport>

  getDesignExportById(
    designId: DesignId,
    designExportId: DesignExportId
  ): Promise<IApiDesignExport>

  getDesignExportResultStream(
    designId: DesignId,
    designExportId: DesignExportId
  ): Promise<NodeJS.ReadableStream>
}

// Design-level API

export interface IApiDesign {
  readonly id: DesignData['id']
  readonly name: DesignData['name']
  readonly format: DesignData['format']
  readonly createdAt: DesignData['created_at']
  readonly completedAt: DesignData['completed_at']
  readonly status: DesignData['status']

  getApiRoot(): string

  getSummary(): Promise<DesignSummary>
  getManifest(): Promise<ManifestData>

  // Design Contents

  getArtboardContent(artboardId: ArtboardId): Promise<OctopusDocument>

  getArtboardContentJsonStream(
    artboardId: ArtboardId
  ): Promise<NodeJS.ReadableStream>

  // Design Exports

  exportDesign(params: {
    format: DesignExportTargetFormatEnum
  }): Promise<IApiDesignExport>

  getDesignExportById(exportId: DesignExportId): Promise<IApiDesignExport>

  getDesignExportResultStream(
    exportId: DesignExportId
  ): Promise<NodeJS.ReadableStream>

  getBitmapAssetStream(bitmapKey: string): Promise<NodeJS.ReadableStream>
}

export interface IApiDesignExport {
  id: DesignExportData['id']
  status: DesignExportData['status']
  resultFormat: DesignExportData['result_format']
  resultUrl: DesignExportData['result_url']

  refresh(): Promise<IApiDesignExport>

  // Design Structure

  designId: DesignData['id']

  // Design Export Results

  getProcessedDesignExport(): Promise<IApiDesignExport>

  getResultStream(): Promise<NodeJS.ReadableStream>
}
