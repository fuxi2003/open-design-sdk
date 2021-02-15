import type { ManifestData } from '@opendesign/octopus-reader/types'
import type { components } from 'open-design-api-types'

type ArtboardId = components['schemas']['ArtboardId']
type ConversionId = components['schemas']['ConversionId']
type ConversionData = components['schemas']['Conversion']
type DesignData = components['schemas']['Design']
type DesignSummary = components['schemas']['DesignSummary']
type DesignId = components['schemas']['DesignId']
type DesignImportFormatEnum = components['schemas']['DesignImportFormatEnum']
type DesignConversionTargetFormatEnum = components['schemas']['DesignConversionTargetFormatEnum']
type OctopusDocument = components['schemas']['OctopusDocument']

// Top-level API

export interface IOpenDesignApiModule {
  createOpenDesignApi(params: { token: string }): IOpenDesignApi
}

export interface IOpenDesignApi {
  // Import

  importDesignFile(
    stream: NodeJS.ReadableStream,
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

  importFigmaDesignLinkWithConversions(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string> | null
    name?: string | null
    conversions: Array<{ format: DesignConversionTargetFormatEnum }>
  }): Promise<{
    designId: DesignId
    conversions: Array<IApiDesignConversion>
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

  // - Design Conversions

  convertDesign(
    designId: DesignId,
    params: { format: DesignConversionTargetFormatEnum }
  ): Promise<IApiDesignConversion>

  getDesignConversionById(
    designId: DesignId,
    conversionId: ConversionId
  ): Promise<IApiDesignConversion>

  getDesignConversionResultStream(
    designId: DesignId,
    conversionId: ConversionId
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

  getSummary(): Promise<DesignSummary>
  getManifest(): Promise<ManifestData>

  // Design Contents

  getArtboardContent(artboardId: ArtboardId): Promise<OctopusDocument>

  getArtboardContentJsonStream(
    artboardId: ArtboardId
  ): Promise<NodeJS.ReadableStream>

  // Design Conversions

  convertDesign(params: {
    format: DesignConversionTargetFormatEnum
  }): Promise<IApiDesignConversion>

  getConversionById(conversionId: ConversionId): Promise<IApiDesignConversion>

  getConversionResultStream(
    conversionId: ConversionId
  ): Promise<NodeJS.ReadableStream>

  getBitmapAssetStream(bitmapKey: string): Promise<NodeJS.ReadableStream>
}

export interface IApiDesignConversion {
  id: ConversionData['id']
  status: ConversionData['status']
  resultFormat: ConversionData['result_format']
  resultUrl: ConversionData['result_url']

  // Design Structure

  designId: DesignData['id']

  // Conversion Results

  getResultStream(): Promise<NodeJS.ReadableStream>
}
