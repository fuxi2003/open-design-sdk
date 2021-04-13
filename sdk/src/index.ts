import { OpenDesignApi } from '@opendesign/api'
import { RenderingEngine } from '@opendesign/rendering'
import { DesignFileManager } from './local/design-file-manager'
import { LocalDesignCache } from './local/local-design-cache'
import { LocalDesignManager } from './local/local-design-manager'
import { SystemFontManager } from './local/system-font-manager'
import { Sdk } from './sdk'

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
 * @category Primary Entry Point
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.avocode.com/docs/authentication). When no token is provided, online services (the API) is not configured.
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 * @param params.workingDirectory An absolute path to the directory against which should the SDK resolve relative file paths and where should it look for its cache directory.
 * @param params.cached Whether to use a local (file system) cache in the form for `.octopus` files. This is enabled by default.
 * @param params.rendering Whether to use a local rendering engine for rendering designs. This is enabled by default.
 * @param params.systemFonts Whether to use local system fonts for rendering designs via the rendering engine. This is enabled by default.
 */
export function createSdk(params: {
  token: string
  apiRoot?: string
  workingDirectory?: string | null
  cached?: boolean
  rendering?: boolean
  systemFonts?: boolean
}) {
  const sdk = new Sdk()

  sdk.useDesignFileManager(new DesignFileManager())
  sdk.useLocalDesignManager(new LocalDesignManager())

  sdk.useOpenDesignApi(
    createOpenDesignApi({
      token: params.token,
      apiRoot: params.apiRoot || null,
    })
  )

  if (params.systemFonts !== false) {
    sdk.useSystemFontManager(new SystemFontManager())
  }

  if (params.cached !== false) {
    sdk.useLocalDesignCache(new LocalDesignCache())
  }

  if (params.rendering !== false) {
    sdk.useRenderingEngine(new RenderingEngine())
  }

  sdk.setWorkingDirectory(params.workingDirectory || null)

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
