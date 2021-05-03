import cancelTokenSource, { CancelToken } from '@avocode/cancel-token'
import { OpenDesignApi } from '@opendesign/api'
import { createRenderingEngine } from '@opendesign/rendering'
import { ConsoleConfig, getConsole } from './utils/console'
import { DesignFileManager } from './local/design-file-manager'
import { LocalDesignCache } from './local/local-design-cache'
import { LocalDesignManager } from './local/local-design-manager'
import { SystemFontManager } from './local/system-font-manager'
import { Sdk } from './sdk'

export type {
  ArtboardId,
  ArtboardOctopusData,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  IBitmap,
  IBitmapMask,
  LayerId,
  LayerOctopusData,
  LayerSelector,
  PageId,
  PageSelector,
} from '@opendesign/octopus-reader'
export type { BlendingMode } from '@opendesign/rendering'

export type { ArtboardFacade, LayerAttributesConfig } from './artboard-facade'
export type { DesignExportFacade } from './design-export-facade'
export type { DesignFacade } from './design-facade'
export type { DesignLayerCollectionFacade } from './design-layer-collection-facade'
export type { FontDescriptor, LayerFacade } from './layer-facade'
export type { BitmapAssetDescriptor } from './local/local-design'
export type { PageFacade } from './page-facade'

/**
 * Creates an SDK instance
 *
 * Based on the provided configuration, various services are made available:
 *
 * - When Open Design API credentials (a token) is provided, the API is configured and available for uploading and downloading designs.
 * - A local rendering engine is available by default.
 * - Local system fonts can be used for rendering design by default.
 * - A local cache is available by default.
 *
 * @example
 * ```typescript
 * // Full SDK
 * const sdk = createSdk({
 *   token: '<TOKEN>',
 * })
 *
 * // Full SDK with all logs for debugging purposes
 * const sdk = createSdk({
 *   token: '<TOKEN>',
 *   console: { level: 'debug' }
 * })
 *
 * // SDK without the local rendering engine
 * const sdk = createSdk({
 *   token: '<TOKEN>',
 *   rendering: false,
 *   systemFonts: false,
 * })
 * ```
 *
 * @category Primary Entry Point
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.avocode.com/docs/authentication). When no token is provided, online services (the API) is not configured.
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 * @param params.workingDirectory An absolute path to the directory against which should the SDK resolve relative file paths and where should it look for its cache directory.
 * @param params.cached Whether to use a local (file system) cache in the form for `.octopus` files. This is enabled by default.
 * @param params.rendering Whether to use a local rendering engine for rendering designs. This is enabled by default.
 * @param params.systemFonts Whether to use local system fonts for rendering designs via the rendering engine. This is enabled by default.
 * @param params.console Configuration of the console/logger. This can either be a log level configuration for the bundled logger or a custom console object. The bundled logger can be replaced with the default node.js console via `{ console: console }`.
 */
export function createSdk(params: {
  token: string
  apiRoot?: string
  workingDirectory?: string | null
  cached?: boolean
  rendering?: boolean
  systemFonts?: boolean
  console?: ConsoleConfig | null
}) {
  const sdkConsole = getConsole(params.console || null)

  const sdk = new Sdk({ console: sdkConsole })

  sdk.useDesignFileManager(new DesignFileManager())
  sdk.useLocalDesignManager(
    new LocalDesignManager({
      console: sdkConsole,
    })
  )

  sdk.useOpenDesignApi(
    createOpenDesignApi({
      token: params.token,
      apiRoot: params.apiRoot || null,
      console: sdkConsole,
    })
  )

  if (params.systemFonts !== false) {
    sdk.useSystemFontManager(new SystemFontManager())
  }

  if (params.cached !== false) {
    sdk.useLocalDesignCache(new LocalDesignCache())
  }

  if (params.rendering !== false) {
    sdk.useRenderingEngineFactory(createRenderingEngine)
  }

  sdk.setWorkingDirectory(params.workingDirectory || null)

  return sdk
}

function createOpenDesignApi(params: {
  token: string
  apiRoot?: string | null
  console: Console
}) {
  const apiRoot = params.apiRoot || 'https://opendesign.avocode.com/api'
  const token = params.token
  if (!token) {
    throw new Error('Open Design API access token not provided')
  }

  const openDesignApi = new OpenDesignApi({
    apiRoot,
    token,
    console: params.console,
  })

  return openDesignApi
}

/**
 * Creates a cancellation token which can be used for aborting asynchronous operations of the SDK.
 *
 * Most asynchronous methods accept a cancellation token (the returned `token`). The same cancellation token can be used for multiple sequential as well as parallel operations. Finished operations no longer react to cancellations.
 *
 * This mechanism is analogous to the standard `AbortSignal`/`AbortController` API with the difference that a cancellation reason can be specified. The created tokens are also somehow compatible with the standard API by exposing the standard `AbortSignal` as `token.signal`, just as it is possible to create a `CancelToken` from an `AbortSignal` via `createCancelToken.fromSignal()`.
 *
 * @example
 * ```typescript
 * const controller = createCancelToken()
 *
 * sdk.fetchDesignById('<ID>', { cancelToken: controller.token })
 *   .then((design) => {
 *     doStuffWithDesign(design)
 *     controller.dispose()
 *   })
 *   .catch((err) => {
 *     if (err.code !== 'OperationCancelled') { throw err }
 *   })
 *
 * setTimeout(() => {
 *   controller.cancel('Timed out.')
 * }, 2000)
 * ```
 */
export const createCancelToken: {
  (): {
    /** The newly created cancellation token. */
    token: CancelToken

    /**
     * A function which cancels the token and operations listening to the token.
     *
     * When the function is called, the token is marked as cancelled and the operations (with pending promises) observing the token end with a promise rejection. The promise is rejected with the `reason` specified here.
     *
     * The conventional is the error object should have the `code` of `OperationCancelled`. When no reason is specified, the token throws an error with `code` of `OperationCancelled`. The same happens when a string reason is provided; the string is used as the message of the error instead of the default "Operation Cancelled" message. A custom error object should be only used when there is proper error handling aware of such errors set up.
     *
     * @example
     * ```typescript
     * cancel() // Error { code: 'OperationCancelled', message: 'Operation Cancelled' }
     * cancel('<MESSAGE>') // Error { code: 'OperationCancelled', message: '<MESSAGE>' }
     * cancel(new Error('<MESSAGE>')) // Error { message: '<MESSAGE>' }
     * ```
     */
    cancel: (reason?: Error | string) => void

    /**
     * A function which clears listeners of all operations listening to the token. The function should be called when the token is no longer useful to ensure garbage collection.
     *
     * The SDK is clearing all registered cancellation listeners automatically so the `dispose()` function may be used for clear of mind and in situations when the token is also used for cancelling other (custom) logic.
     */
    dispose: () => void
  }

  /**
   * A cancellation token which never gets cancelled.
   *
   * This token can be used for logic simplification in place of actual working tokens as a default (i.e. `cancelToken || null` to avoid the need for `token?.throwIfCancelled()`).
   */
  empty: CancelToken

  /**
   * Wraps an existing standard `AbortSignal` in a new cancellation token which can be used with the SDK.
   *
   * @example
   * ```typescript
   * const abortController = new AbortController()
   * const cancelController = createCancelToken.fromSignal(abortController.signal)
   *
   * sdk.fetchDesignById('<ID>', { cancelToken: cancelController.token })
   *   .then((design) => {
   *     doStuffWithDesign(design)
   *     cancelController.dispose()
   *   })
   *   .catch((err) => {
   *     if (err.code !== 'OperationCancelled') { throw err }
   *   })
   *
   * setTimeout(() => {
   *   abortController.abort()
   * }, 2000)
   * ```
   */
  fromSignal: (
    signal: AbortSignal
  ) => {
    /** The newly created cancellation token. */
    token: CancelToken

    /**
     * A function which clears listeners of all operations listening to the token. The function should be called when the token is no longer useful to ensure garbage collection.
     *
     * The SDK is clearing all registered cancellation listeners automatically so the `dispose()` function may be used for clear of mind and in situations when the token is also used for cancelling other (custom) logic.
     */
    dispose: () => void
  }
} = cancelTokenSource

export { DesignFileManager, LocalDesignManager, OpenDesignApi, Sdk }
export { CancelToken }
