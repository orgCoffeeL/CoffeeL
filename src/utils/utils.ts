import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { CoffeeLConfig, MsaCode } from './constants.js'
import { queueMessage, sendQueuedMessages } from './webhookUtils.js'

let logs = ''
let cachedConfig: CoffeeLConfig | null = null
const absolutePath = getPath()
const ansiRegex = /\x1b\[[0-9;]*m/g
const logDate = new Date()
const filename = `date${logDate.getFullYear()}-${logDate.getMonth() + 1}-${logDate.getDate()}time${logDate.getHours()}-${logDate.getMinutes()}-${logDate.getSeconds()}.log`
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  purple: '\x1b[35m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
}

const criticalErrors = [
  'client timed out'
]

function log (message: string, prefix: string = 'LOG'): void {
  writeLog(message, prefix)
  console.log(`[${new Date().toLocaleString()}] ${getColor(prefix)}[${prefix}]${getColor()} ${message}`)

  if (message.startsWith('[CHAT]') && !getEasyConfig().webhook.logChat) return
  if (message.startsWith('[LOG]') && !getEasyConfig().webhook.logConsole) return
  queueMessage(`[${prefix}] ${message.replace(ansiRegex, '')}`)
}

function getEasyConfig (): CoffeeLConfig {
  if (cachedConfig != null) {
    return cachedConfig
  }

  cachedConfig = getConfig()
  return cachedConfig
}

function getConfig (): CoffeeLConfig {
  try {
    const read = JSON.parse(readFileSync(join(absolutePath, 'config.json'), 'utf8'))
    cachedConfig = read
    return read
  } catch (error) {
    log('Error trying to parse config.json, try using https://jsonchecker.com/', 'ERROR')
    log(error.toString(), 'ERROR')
    if (error.toString().includes('no such file or directory') as boolean) {
      checkConfig()
    }

    exitProcess()
    return {} as CoffeeLConfig
  }
}

function handleError (error: Error | string): void {
  log(error.toString(), 'ERROR')
  exitProcess()
}

function getColor (prefix: string = ''): string {
  switch (prefix) {
    case 'LOG':
      return colors.blue
    case 'ERROR':
      return colors.red
    case 'CHAT':
      return colors.green
    case 'SERVER':
      return colors.cyan
    default:
      return colors.reset
  }
}

function onMsaCode (data: MsaCode): void {
  log(`Please go to https://microsoft.com/link and enter the code ${data.user_code} to authenticate`)
}

const noColorsPrefixes = [
  'CHAT'
]

function writeLog (message: string, prefix: string): void {
  const content = `[${new Date().toLocaleString()}] [${prefix}] ${(noColorsPrefixes.includes(prefix)) ? message.replace(ansiRegex, '') : message}`
  logs += content + '\n'
}

function checkConfig (): void {
  if (!existsSync(join(absolutePath, 'config.json'))) {
    log('config.json not found, creating a default one, please fill it and restart the bot', 'ERROR')
    writeFileSync(join(absolutePath, 'config.json'), JSON.stringify({
      webhook: {
        url: '',
        logConsole: true,
        logChat: true
      },
      visit: {
        enabled: false,
        username: ''
      },
      'accept-party': {
        enabled: false
      },
      logging: {
        logChat: true
      },
      webpage: {
        port: 80
      },
      rpc: true
    }, null, 2))

    exitProcess()
  }
}

function checkLogs (): void {
  if (!existsSync(join(absolutePath, 'logs'))) {
    mkdirSync(join(absolutePath, 'logs'))
  }

  writeFileSync(join(absolutePath, 'logs', filename), '')

  const files = readdirSync(join(absolutePath, 'logs'))
  if (files.length >= 10) {
    const orderedFiles = files.map(file => {
      return {
        file,
        mtime: statSync(join(absolutePath, 'logs', file)).mtime
      }
    }).sort((a, b) => a.mtime.getTime() - b.mtime.getTime())
    rmSync(join(absolutePath, 'logs', orderedFiles[0].file))
  }
}

function shouldRestart (message: string): boolean {
  return criticalErrors.some(criticalError => message.includes(criticalError))
}

async function sleep (ms: number): Promise<void> {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

function getPath (): string {
  // @ts-expect-error
  if (process.pkg?.entrypoint != null) {
    return dirname(process.execPath)
  } else {
    return join(__dirname, '..', '..')
  }
}

function isPackaged (): boolean {
  // @ts-expect-error
  return process.pkg?.entrypoint != null
}

function syncTimeout (ms: number, cb: () => any): void {
  setTimeout(cb, ms)
}

function exitProcess (...args: any[]): void {
  console.log(`Exited with ${args.join(', ')}`)
  sendQueuedMessages()
  checkLogs()
  writeFileSync(join(absolutePath, 'logs', filename), logs)
  process.exit(0)
}

process.on('exit', exitProcess)
process.on('SIGINT', exitProcess)
process.on('SIGUSR1', exitProcess)
process.on('SIGUSR2', exitProcess)

export {
  log,
  getEasyConfig,
  getConfig,
  handleError,
  onMsaCode,
  checkLogs,
  checkConfig,
  shouldRestart,
  exitProcess,
  sleep,
  getPath,
  isPackaged,
  syncTimeout
}
