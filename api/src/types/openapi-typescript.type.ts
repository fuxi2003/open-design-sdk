// openapi-typescript typing

export type Parameters = {
  path?: { [key: string]: unknown }
  query?: { [key: string]: unknown }
  header?: { [key: string]: string }
}

export type RequestBody = { [key: string]: unknown }
export type RequestBodies = { [contentType: string]: RequestBody }

export type ResponsesByContentType = {
  [contentType: string]: unknown
}

export type IOperation = {
  parameters?: Parameters
  requestBody?: RequestBodies
  responses: {
    [statusCode: number]: ResponsesByContentType | never
    default?: ResponsesByContentType | never
  }
}

export type IPathOperations = {
  get?: IOperation
  post?: IOperation
}

export type IPathRecord = {
  [pathPattern: string]: IPathOperations
}

export type IOperationRecord = {
  [operationId: string]: IOperation
}
