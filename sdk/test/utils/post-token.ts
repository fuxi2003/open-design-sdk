import { post } from '@opendesign/api/src/utils/fetch'
import { ok } from 'assert'

export async function postToken(params: {
  apiRoot: string
  email: string
  name: string
}) {
  const { body } = (await post(
    params.apiRoot,
    // @ts-ignore
    '/token',
    {},
    {
      'email': params.email,
      'name': params.name,
    }
  )) as {
    statusCode: 201 | 400 | 500
    body:
      | { 'token': string }
      | { 'error': { 'code': string; 'message'?: string } }
  }

  if (!('token' in body)) {
    throw new Error('Token not received')
  }

  return body['token']
}
