import { DesignFacade } from '../design-facade'

import type { IApiDesign, IApiDesignConversion } from '@opendesign/api'
import type { ILocalDesign } from '../types/local-design.iface'
import type { Sdk } from '../sdk'

export async function createDesignFromLocalDesign(
  localDesign: ILocalDesign,
  params: {
    sdk: Sdk
    sourceFilename?: string | null
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
    sourceFilename?: string | null
    conversions?: Array<IApiDesignConversion> | null
  }
): Promise<DesignFacade> {
  const design = new DesignFacade({ sdk: params.sdk })

  await design.setApiDesign(apiDesign)

  if (params.conversions) {
    params.conversions.forEach((conversion) => {
      design.addConversion(conversion)
    })
  }

  return design
}
