import { OpenDesignApi } from '@opendesign/api'
import { Sdk } from './sdk'

/**
 * Creates an SDK instance with online services configured.
 *
 * Such an SDK instance is not able to upload design files to the Open Design API but can download data from the API and query the designs for various content (layers, bitmap assets, font usage, …).
 *
 * @category Experimental Entry Point
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.avocode.com/docs/authentication).
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 */
export function createSdk(params: { token: string; apiRoot?: string | null }) {
  const sdk = new Sdk()
  configureOnlineServices(sdk, params)
  return sdk
}

function configureOnlineServices(
  sdk: Sdk,
  params: { token: string; apiRoot?: string | null }
) {
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

export { OpenDesignApi, Sdk }
