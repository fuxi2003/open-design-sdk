import { createDesignFromOpenDesignApiDesign } from './utils/design-factories'

import type { IOpenDesignApi } from '@opendesign/api/types'
import type { ISdk } from './types/ifaces'

export class Sdk implements ISdk {
  _openDesignApi: IOpenDesignApi | null = null

  async fetchDesignById(designId: string): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.getDesignById(designId)
    const designFacade = await createDesignFromOpenDesignApiDesign(apiDesign, {
      sdk: this,
    })

    return designFacade
  }

  useOpenDesignApi(api: IOpenDesignApi): void {
    this._openDesignApi = api
  }
}
