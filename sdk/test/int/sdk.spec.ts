import { deepStrictEqual, doesNotThrow, ok, strictEqual } from 'assert'
import { readFileSync, statSync, unlinkSync } from 'fs'

import { createOctopusFile } from '../utils/octopus-file'
import { createSdk } from '../utils/sdk'
import { createTempFileTarget } from '../utils/temp-location'

import {
  multiArtboardSketchFileFixture,
  singleArtboardSketchFileFixture,
} from '../design-files/fixtures'

import type {
  ArtboardOctopusData,
  ManifestData,
} from '@opendesign/octopus-reader/types'

describe('DesignFacade', () => {
  describe('local files', () => {
    it('should return the manifest read from disk', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { filename, manifest } = await createOctopusFile('file.octopus')
      const designFacade = await sdk.openOctopusFile(filename)

      deepStrictEqual(designFacade.getManifest(), manifest)
    })

    it('should return artboard octopus data read from disk', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { filename, artboardOctopuses } = await createOctopusFile(
        'file.octopus'
      )
      const designFacade = await sdk.openOctopusFile(filename)

      const artboardFacade = designFacade.getArtboardById('a')
      ok(artboardFacade)
      deepStrictEqual(await artboardFacade.getContent(), artboardOctopuses['a'])
    })

    it('should save all its data to a new location', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const {
        filename: originalFilename,
        manifest,
        artboardOctopuses,
      } = await createOctopusFile('original.octopus')
      const designFacade = await sdk.openOctopusFile(originalFilename)

      const copyFilename = await createTempFileTarget('copy.octopus')
      await designFacade.saveOctopusFile(copyFilename)

      deepStrictEqual(
        JSON.parse(readFileSync(`${copyFilename}/manifest.json`, 'utf8')),
        manifest
      )
      deepStrictEqual(
        JSON.parse(
          readFileSync(`${copyFilename}/artboards/a/data.json`, 'utf8')
        ),
        artboardOctopuses['a']
      )
    })

    it('should open a non-existent octopus file', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      await sdk.openOctopusFile('/tmp/random-file.octopus')
    })

    it('should fail opening an octopus file without the .octopus extension', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { filename } = await createOctopusFile('file.random')
      const [result] = await Promise.allSettled([sdk.openOctopusFile(filename)])
      strictEqual(result.status, 'rejected')
    })

    it('should fail opening an octopus file without a manifest', async () => {
      const { sdk } = await createSdk({ localDesigns: true })

      const { filename } = await createOctopusFile('file.octopus')
      unlinkSync(`${filename}/manifest.json`)

      const [result] = await Promise.allSettled([sdk.openOctopusFile(filename)])
      strictEqual(result.status, 'rejected')
    })
  })

  describe('design uploads', () => {
    it('should return contents of an uploaded design', async function () {
      const { sdk } = await createSdk({ designFiles: true, api: true })

      const designFacade = await sdk.openDesignFile(
        singleArtboardSketchFileFixture.filename
      )

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const artboardFacade = designFacade.findArtboard({
        name: fixtureArtboardDesc.name,
      })
      ok(artboardFacade)

      const octopus = await artboardFacade.getContent()
      strictEqual(octopus['bounds']?.['width'], fixtureArtboardDesc.width)
      strictEqual(octopus['bounds']?.['height'], fixtureArtboardDesc.height)
    })

    it('should list all bitmaps in an uploaded design', async function () {
      const { sdk } = await createSdk({ designFiles: true, api: true })

      const designFacade = await sdk.openDesignFile(
        multiArtboardSketchFileFixture.filename
      )

      const bitmapAssetDesc = await designFacade.getBitmapAssets()
      strictEqual(
        bitmapAssetDesc.length,
        multiArtboardSketchFileFixture.bitmapCount
      )
    })
  })

  describe('design downloading', () => {
    let designId: string
    let tokenFromBefore: string

    before(async function () {
      const { sdk, token } = await createSdk({
        designFiles: true,
        api: true,
      })
      ok(token)
      tokenFromBefore = token

      const designFacade = await sdk.openDesignFile(
        singleArtboardSketchFileFixture.filename
      )
      ok(designFacade.id)
      designId = designFacade.id
    })

    it('should return contents of an uploaded design', async function () {
      const { sdk } = await createSdk({ token: tokenFromBefore, api: true })
      const designFacade = await sdk.fetchDesignById(designId)

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const artboardFacade = designFacade.findArtboard({
        name: fixtureArtboardDesc.name,
      })
      ok(artboardFacade)

      const octopus = await artboardFacade.getContent()
      strictEqual(octopus['bounds']?.['width'], fixtureArtboardDesc.width)
      strictEqual(octopus['bounds']?.['height'], fixtureArtboardDesc.height)
    })

    it('should save contents of an uploaded design', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = await createTempFileTarget('file.octopus')
      await designFacade.saveOctopusFile(filename)

      const manifest: ManifestData = JSON.parse(
        readFileSync(`${filename}/manifest.json`, 'utf8')
      )
      strictEqual(
        manifest['artboards'].length,
        singleArtboardSketchFileFixture.artboards.length
      )

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const octopus: ArtboardOctopusData = JSON.parse(
        readFileSync(
          `${filename}/artboards/${fixtureArtboardDesc.id}/data.json`,
          'utf8'
        )
      )
      strictEqual(octopus['bounds']?.['width'], fixtureArtboardDesc.width)
      strictEqual(octopus['bounds']?.['height'], fixtureArtboardDesc.height)
    })

    it('should cache the manifest of a fetched design in a local file', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = designFacade.filename
      ok(filename)

      const manifest: ManifestData = JSON.parse(
        readFileSync(`${filename}/manifest.json`, 'utf8')
      )
      strictEqual(
        manifest['artboards'].length,
        singleArtboardSketchFileFixture.artboards.length
      )
    })

    it('should cache artboard octopuses of a fetched design in a local file', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        localDesigns: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = designFacade.filename
      ok(filename)

      const [fixtureArtboardDesc] = singleArtboardSketchFileFixture.artboards
      ok(fixtureArtboardDesc)

      const artboardFacade = designFacade.getArtboardById(
        fixtureArtboardDesc.id
      )
      const artboardOctopus = await artboardFacade?.getContent()
      ok(artboardOctopus)

      const localOctopus: ArtboardOctopusData = JSON.parse(
        readFileSync(
          `${filename}/artboards/${fixtureArtboardDesc.id}/data.json`,
          'utf8'
        )
      )
      deepStrictEqual(localOctopus, artboardOctopus)
    })
  })

  describe('figma designs', () => {
    let designId: string
    let tokenFromBefore: string

    before(async function () {
      const { sdk, token } = await createSdk({ api: true })
      ok(token)
      tokenFromBefore = token

      const designFacade = await sdk.openFigmaDesign({
        figmaToken: process.env['E2E_FIGMA_TOKEN'] || '',
        figmaFileKey: process.env['E2E_FIGMA_FILE_KEY'] || '',
      })
      ok(designFacade.id)
      designId = designFacade.id
    })

    it('should save a Sketch conversion result file', async function () {
      const { sdk } = await createSdk({
        token: tokenFromBefore,
        designFiles: true,
        api: true,
      })

      const designFacade = await sdk.fetchDesignById(designId)

      const filename = await createTempFileTarget('file.sketch')
      await designFacade.saveDesignFile(filename)

      doesNotThrow(() => {
        const stats = statSync(filename)
        ok(stats.isFile())
        ok(stats.size > 0)
      })
    })
  })

  describe('figma designs with immediate conversion', () => {
    it('should save a Sketch conversion result file', async function () {
      const { sdk } = await createSdk({ designFiles: true, api: true })

      const designFacade = await sdk.convertFigmaDesign({
        figmaToken: process.env['E2E_FIGMA_TOKEN'] || '',
        figmaFileKey: process.env['E2E_FIGMA_FILE_KEY'] || '',
        conversions: [{ format: 'sketch' }],
      })

      const filename = await createTempFileTarget('file.sketch')
      await designFacade.saveDesignFile(filename)

      doesNotThrow(() => {
        const stats = statSync(filename)
        ok(stats.isFile())
        ok(stats.size > 0)
      })
    })
  })
})