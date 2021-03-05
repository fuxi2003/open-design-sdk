import { OpenDesignApi } from '@opendesign/api/src/open-design-api'
import { DesignFileManager } from './local/design-file-manager'
import { LocalDesignManager } from './local/local-design-manager'
import { Sdk } from './sdk'

import type { ISdk } from './types/sdk.iface'

/**
 * Creates an SDK instance with both online and offline services configured.
 *
 * Such an SDK instance is able to upload design files to the Open Design API, download data from the API, query the designs for various content (layers, bitmap assets, font usage, …) and save data to a local file system cache as well as generate and read `.octopus` files.
 *
 * @category Primary Entry Point
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.avocode.com/docs/authentication).
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 */
export function createSdk(params: {
  token: string
  apiRoot?: string | null
}): ISdk {
  const sdk = new Sdk()
  configureOfflineServices(sdk)
  configureOnlineServices(sdk, params)
  return sdk
}

/**
 * Creates an SDK instance with online services and some offline services configured.
 *
 * Such an SDK instance is able to upload design files to the Open Design API, download data from the API, query the designs for various content (layers, bitmap assets, font usage, …) but cannot save data to a local file system cache nor can it generate or read `.octopus` files.
 *
 * @category Primary Entry Point
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.avocode.com/docs/authentication).
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 */
export function createUncachedSdk(params: {
  token: string
  apiRoot?: string | null
}): ISdk {
  const sdk = new Sdk()
  configureOfflineUncachedServices(sdk)
  configureOnlineServices(sdk, params)
  return sdk
}

/**
 * Creates an SDK instance with offline services configured.
 *
 * Such an SDK instance is not connected to the Open Design API and can only work with local `.octopus` files. It can query the designs for various content (layers, bitmap assets, font usage, …).
 *
 * @category Experimental Entry Point
 */
export function createOfflineSdk(): ISdk {
  const sdk = new Sdk()
  configureOfflineServices(sdk)
  return sdk
}

/**
 * Creates an SDK instance with online services configured.
 *
 * Such an SDK instance is not able to upload design files to the Open Design API but can download data from the API and query the designs for various content (layers, bitmap assets, font usage, …).
 *
 * @category Experimental Entry Point
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.avocode.com/docs/authentication).
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 */
export function createOnlineSdk(params: {
  token: string
  apiRoot?: string | null
}): ISdk {
  const sdk = new Sdk()
  configureOnlineServices(sdk, params)
  return sdk
}

function configureOfflineServices(sdk: ISdk): ISdk {
  configureOfflineUncachedServices(sdk)
  configureOfflineCacheServices(sdk)
  return sdk
}

function configureOfflineUncachedServices(sdk: ISdk): ISdk {
  sdk.useDesignFileManager(new DesignFileManager())
  return sdk
}

function configureOfflineCacheServices(sdk: ISdk): ISdk {
  sdk.useLocalDesignManager(new LocalDesignManager())
  return sdk
}

function configureOnlineServices(
  sdk: ISdk,
  params: { token: string; apiRoot?: string | null }
): ISdk {
  sdk.useOpenDesignApi(createOpenDesignApi(params))
  return sdk
}

function createOpenDesignApi(params: {
  token: string
  apiRoot?: string | null
}) {
  const apiRoot = params.apiRoot || 'https://opendesign.avocode.com/api'
  const token = params.token
  if (!token) {
    throw new Error('Open Design API access token not provided')
  }

  const openDesignApi = new OpenDesignApi({
    apiRoot,
    token,
  })

  return openDesignApi
}

export { DesignFileManager, LocalDesignManager, OpenDesignApi, Sdk }
