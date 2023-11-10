import { Bot } from 'mineflayer'

interface CoffeeL extends Bot {
  coffeel: {
    start: () => Promise<void>
    restart: (reason?: string) => Promise<void>
  }
}

interface CoffeeResponse {
  file: string
}

interface CoffeeLConfig {
  webhook: {
    url: string
    logConsole: boolean
    logChat: boolean
  }
  visit: {
    enabled: boolean
    username: string
  }
  'accept-party': {
    enabled: boolean
  }
  logging: {
    logChat: boolean
  }
  webpage: {
    port: number
  }
  rpc: boolean
}

interface MsaCode {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
  message: string
}

export {
  CoffeeL,
  CoffeeLConfig,
  MsaCode,
  CoffeeResponse
}
