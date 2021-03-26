import { promisify } from 'util'
import { dirname } from 'path'
import mkdirp from 'mkdirp'
import * as fs from 'fs'
import * as fsExtra from 'fs-extra'

export async function checkFile(filename: string): Promise<boolean> {
  const stat = promisify(fs.stat)
  try {
    const stats = await stat(filename)
    return stats.isFile() && stats.size > 0
  } catch (err) {
    return false
  }
}

export async function readJsonFile(filename: string): Promise<unknown> {
  const readFile = promisify(fs.readFile)
  const json = await readFile(filename, 'utf8')
  return JSON.parse(json)
}

export async function writeJsonFile(
  filename: string,
  data: object
): Promise<void> {
  await mkdirp(dirname(filename))

  const writeFile = promisify(fs.writeFile)
  const json = JSON.stringify(data)
  await writeFile(filename, json)
}

export function readFileStream(filename: string): fs.ReadStream {
  return fs.createReadStream(filename)
}

export function readFileBlob(filename: string): Promise<Buffer> {
  const readFile = promisify(fs.readFile)
  return readFile(filename)
}

export async function writeJsonFileStream(
  filename: string,
  dataStream: NodeJS.ReadableStream
): Promise<void> {
  await mkdirp(dirname(filename))

  const writeStream = fs.createWriteStream(filename)

  return new Promise((resolve, reject) => {
    writeStream.once('close', resolve)
    writeStream.once('error', reject)
    dataStream.once('error', reject)

    dataStream.pipe(writeStream)
  })
}

export function writeFileBlob(filename: string, blob: Buffer): Promise<void> {
  const writeFile = promisify(fs.writeFile)
  return writeFile(filename, blob)
}

export function deleteFile(filename: string): Promise<void> {
  const unlink = promisify(fs.unlink)
  return unlink(filename)
}

export function copyDirectory(
  prevDirname: string,
  nextDirname: string
): Promise<void> {
  const copy = promisify(fsExtra.copy)
  return copy(prevDirname, nextDirname)
}

export function moveDirectory(
  prevDirname: string,
  nextDirname: string
): Promise<void> {
  const rename = promisify(fs.rename)
  return rename(prevDirname, nextDirname)
}
