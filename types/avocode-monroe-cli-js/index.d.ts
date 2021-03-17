declare module '@avocode/monroe-cli' {
  import type { ChildProcess } from 'child_process'

  export function spawn_cli(): ChildProcess
  export function check(): Promise<void>
}
