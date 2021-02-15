import { populatePathPattern, PathParams } from './paths'
import fetch, { Headers, RequestInit } from 'node-fetch'
import FormData from 'form-data'

import type { OptionalKeys, RequiredKeys } from 'utility-types'
import type { paths } from 'open-design-api-types'
import type {
  OperationBodyParams,
  OperationMultipartBodyParams,
  OperationResponse,
  OperationStatusCodes,
} from '../types/operation.type'
import { IOperation } from '../types/openapi-typescript.type'
import { keys } from './object'

type MethodPathPatterns<M> = {
  [P in keyof paths]: M extends keyof paths[P] ? P : never
}[keyof paths]

// JSON

export async function get<
  PathPattern extends MethodPathPatterns<'get'>,
  Operation extends paths[PathPattern]['get']
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>
): Promise<Exclude<OperationResponse<Operation>, { statusCode: 500 }>> {
  return request('get', apiRoot, pathPattern, pathParams)
}

export async function post<
  PathPattern extends MethodPathPatterns<'post'>,
  Operation extends paths[PathPattern]['post']
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  data: OperationBodyParams<Operation, 'application/json'>
): Promise<Exclude<OperationResponse<Operation>, { statusCode: 500 }>> {
  return request(
    'post',
    apiRoot,
    pathPattern,
    pathParams,
    {
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

// Streams

export async function getStream<
  PathPattern extends MethodPathPatterns<'get'>,
  Operation extends paths[PathPattern]['get']
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>
): Promise<{
  statusCode: Exclude<OperationStatusCodes<Operation>, 500>
  headers: Headers
  stream: NodeJS.ReadableStream
}> {
  return requestStream('get', apiRoot, pathPattern, pathParams)
}

// MultipartFilePart

export async function postMultipart<
  PathPattern extends MethodPathPatterns<'post'>,
  Operation extends paths[PathPattern]['post'],
  MultipartBody extends OperationMultipartBodyParams<Operation>
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  data: {
    [K in Extract<RequiredKeys<MultipartBody>, string>]:
      | MultipartBody[K]
      | NodeJS.ReadableStream
  } &
    {
      [K in Extract<OptionalKeys<MultipartBody>, string>]?:
        | MultipartBody[K]
        | NodeJS.ReadableStream
    }
): Promise<Exclude<OperationResponse<Operation>, { statusCode: 500 }>> {
  const path = populatePathPattern(pathPattern, pathParams)

  const requestBody = new FormData()
  keys(data).forEach((fieldName) => {
    requestBody.append(fieldName, data[fieldName])
  })

  const res = await fetch(`${apiRoot}${path}`, {
    method: 'post',
    body: requestBody,
  })
  const body = await res.json()

  if (res.status === 500) {
    console.log('Server Error', { statusCode: res.status, body })
    throw new Error('Server Error')
  }

  return {
    statusCode: res.status,
    headers: res.headers,
    body,
  } as Exclude<OperationResponse<Operation>, { statusCode: 500 }>
}

// General

async function request<
  PathPattern extends string,
  Operation extends IOperation
>(
  method: string,
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  requestParams: Omit<RequestInit, 'method'> = {}
) {
  const path = populatePathPattern(pathPattern, pathParams)

  const res = await fetch(`${apiRoot}${path}`, { method, ...requestParams })
  const body = await res.json()

  if (res.status === 500) {
    console.log('Server Error', { statusCode: res.status, body })
    throw new Error('Server Error')
  }

  return {
    statusCode: res.status,
    headers: res.headers,
    body,
  } as Exclude<OperationResponse<Operation>, { statusCode: 500 }>
}

async function requestStream<
  PathPattern extends string,
  Operation extends IOperation
>(
  method: string,
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>
) {
  const path = populatePathPattern(pathPattern, pathParams)

  const res = await fetch(`${apiRoot}${path}`, { method })

  if (res.status === 500) {
    console.log('Server Error', { statusCode: res.status })
    throw new Error('Server Error')
  }

  return {
    statusCode: res.status as Exclude<OperationStatusCodes<Operation>, 500>,
    headers: res.headers,
    stream: res.body,
  }
}
