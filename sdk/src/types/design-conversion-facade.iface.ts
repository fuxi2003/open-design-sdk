import type { IApiDesignConversion } from '@opendesign/api'

export interface IDesignConversionFacade {
  readonly id: IApiDesignConversion['id']
  readonly designId: IApiDesignConversion['designId']
  readonly status: IApiDesignConversion['status']
  readonly resultFormat: IApiDesignConversion['resultFormat']

  getResultUrl(): Promise<string>

  getResultStream(): Promise<NodeJS.ReadableStream>
}
