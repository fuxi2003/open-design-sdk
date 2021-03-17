import { createQueue } from './utils/queue'
import { spawn_cli as spawnMonroeCli } from '@avocode/monroe-cli'

import type { ChildProcess } from 'child_process'
import type { IRenderingProcess } from './types/rendering-process.iface'
import type {
  CommandResults,
  CommonResult,
  RenderingCommand,
} from './types/commands.type'

export class RenderingProcess implements IRenderingProcess {
  private _process: ChildProcess | null = null

  init() {
    this._process = spawnMonroeCli()

    this._process.on('error', (err) => {
      console.log('RenderingProcess error:', err)
    })

    this._process.stdout?.on('data', (data) => {
      console.log('RenderingProcess stdout:', String(data))
    })
    this._process.stderr?.on('data', (data) => {
      console.log('RenderingProcess stderr:', String(data))
    })
  }

  execCommand = createQueue(
    <
      CmdName extends RenderingCommand['cmd'],
      Cmd extends Extract<RenderingCommand, { 'cmd': CmdName }>
    >(
      cmdName: CmdName,
      data: Omit<Cmd, 'cmd'>
    ) => {
      return this._execCommand(cmdName, data)
    }
  )

  _execCommand<
    CmdName extends RenderingCommand['cmd'],
    Cmd extends Extract<RenderingCommand, { 'cmd': CmdName }>
  >(
    cmdName: CmdName,
    data: Omit<Cmd, 'cmd'>
  ): Promise<
    CmdName extends keyof CommandResults
      ? CommandResults[CmdName]
      : CommonResult
  > {
    const renderingProcess = this._process
    if (!renderingProcess) {
      throw new Error('Rendering process not initialized')
    }

    const { stdin, stdout } = renderingProcess
    if (!stdin || !stdout) {
      throw new Error('Rendering process I/O is not available')
    }

    return new Promise((resolve, reject) => {
      const handleData = (responseJson: Buffer | string) => {
        const response = JSON.parse(String(responseJson))
        renderingProcess.removeListener('error', handleError)
        resolve(response)
      }

      const handleError = (err: Error) => {
        stdout.removeListener('data', handleData)
        reject(err)
      }

      stdout.once('data', handleData)
      renderingProcess.once('error', handleError)

      const cmdJson = JSON.stringify({ 'cmd': cmdName, ...data })
      console.log('RenderingProcess stdin>', cmdJson)
      stdin.write(`${cmdJson}\n`)
    })
  }
}
