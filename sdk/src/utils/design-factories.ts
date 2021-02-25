import { DesignFacade } from '../design-facade'

import type { IApiDesign } from '@opendesign/api/types'
import type { ILocalDesign } from '../local/ifaces'
import type { Sdk } from '../sdk'

export async function createDesignFromLocalDesign(
  localDesign: ILocalDesign,
  params: {
    sdk: Sdk
  }
): Promise<DesignFacade> {
  const design = new DesignFacade(params)

  await design.setLocalDesign(localDesign)

  return design
}

export async function createDesignFromOpenDesignApiDesign(
  apiDesign: IApiDesign,
  params: {
    sdk: Sdk
  }
): Promise<DesignFacade> {
  const design = new DesignFacade({ sdk: params.sdk })

  await design.setApiDesign(apiDesign)

  return design
}
