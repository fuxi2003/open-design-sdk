import { DesignExportFacade } from '../design-export-facade'
import { DesignFacade } from '../design-facade'

import type { IApiDesign, IApiDesignExport } from '@opendesign/api'
import type { LocalDesign } from '../local/local-design'
import type { Sdk } from '../sdk'

export async function createDesignFromLocalDesign(
  localDesign: LocalDesign,
  params: {
    sdk: Sdk
    console?: Console | null
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
    console?: Console | null
    sourceFilename?: string | null
    exports?: Array<IApiDesignExport> | null
  }
): Promise<DesignFacade> {
  const design = new DesignFacade({
    sdk: params.sdk,
    console: params.console,
  })

  await design.setApiDesign(apiDesign)

  if (params.exports) {
    params.exports.forEach((designExport) => {
      const designExportFacade = new DesignExportFacade(designExport, {
        sdk: params.sdk,
      })
      design.addDesignExport(designExportFacade)
    })
  }

  return design
}
