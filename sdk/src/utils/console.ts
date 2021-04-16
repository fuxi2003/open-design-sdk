import cplus, { LogLevels } from 'cplus'

const cplusLogLevels = {
  'error': LogLevels.ERROR,
  'warn': LogLevels.WARN,
  'info': LogLevels.INFO,
  'debug': LogLevels.DEBUG,
}

export type ConsoleConfig =
  | Console
  | { level: 'error' | 'warn' | 'info' | 'debug' }

export function getConsole(consoleConfig: ConsoleConfig | null): Console {
  const sdkConsole =
    consoleConfig && !('level' in consoleConfig)
      ? consoleConfig
      : cplus.create({
          logLevel: cplusLogLevels[consoleConfig?.level || 'warn'],
        })

  return sdkConsole
}
