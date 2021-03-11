import { DesignFileManager } from '../../src/local/design-file-manager'
import { LocalDesignManager } from '../../src/local/local-design-manager'
import { Sdk } from '../../src/sdk'

import { createOpenDesignApi } from './open-design-api'

export async function createSdk(params: {
  token?: string | null
  localDesigns?: boolean
  designFiles?: boolean
  api?: boolean
}) {
  const sdk = new Sdk()

  if (params.localDesigns) {
    sdk.useLocalDesignManager(new LocalDesignManager())
  }
  if (params.designFiles) {
    sdk.useDesignFileManager(new DesignFileManager())
  }

  const { openDesignApi, apiRoot, token } = params.api
    ? await createOpenDesignApi({ token: params.token })
    : { openDesignApi: null, apiRoot: null, token: null }

  if (openDesignApi) {
    sdk.useOpenDesignApi(openDesignApi)
  }

  return { sdk, apiRoot, token }
}
