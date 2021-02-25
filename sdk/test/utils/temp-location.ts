import { tmpdir } from 'os'
import { join } from 'path'
import mkdirp from 'mkdirp'
import { v4 as uuid } from 'uuid'

export async function createTempLocation() {
  const dirname = tmpdir()
  const id = `opendesignsdk-test-${uuid()}`

  const location = `${dirname}/${id}`
  await mkdirp(location)

  return location
}

export async function createTempFileTarget(relPath: string) {
  const tempDirname = await createTempLocation()
  return join(tempDirname, relPath)
}
