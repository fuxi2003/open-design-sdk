import { OpenDesignApi } from '@opendesign/api/src/open-design-api'
import { DesignFileManager } from './local/design-file-manager'
import { LocalDesignManager } from './local/local-design-manager'
import { Sdk } from './sdk'

import type { ISdk } from './types/sdk.iface'

export function createSdk(params: {
  token: string
  apiRoot?: string | null
}): ISdk {
  const sdk = new Sdk()
  configureOfflineServices(sdk)
  configureOnlineServices(sdk, params)
  return sdk
}

export function createOfflineSdk(): ISdk {
  const sdk = new Sdk()
  configureOfflineServices(sdk)
  return sdk
}

export function createOnlineSdk(params: {
  token: string
  apiRoot?: string | null
}): ISdk {
  const sdk = new Sdk()
  configureOnlineServices(sdk, params)
  return sdk
}

function configureOfflineServices(sdk: ISdk): ISdk {
  sdk.useLocalDesignManager(new LocalDesignManager())
  sdk.useDesignFileManager(new DesignFileManager())
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
