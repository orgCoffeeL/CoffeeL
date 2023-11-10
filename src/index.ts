import { createBot } from 'mineflayer'
import chat from 'prismarine-chat'
import express from 'express'
import { createServer } from 'http'
import { CoffeeL } from './utils/constants.js'
import { getConfig, shouldRestart, log, onMsaCode, sleep, exitProcess, syncTimeout } from './utils/utils.js'
import { tpToIsland, tpToLobby, tpToSkyblock } from './core/tpHandler.js'
import { startRpc } from './utils/rpcUtils.js'
import { startWebhook } from './utils/webhookUtils.js'
import { handleMessage, isIsland } from './core/messageHandler.js'
import { version } from './version.js'

import app from './routes/app.js'

const routes = [
  app
]

async function startCoffeeL (): Promise<void> {
  log(`Starting CoffeeL v${version}`)

  let kickedRetries = 0
  let islandCheckInterval: NodeJS.Timeout | null = null
  const builder = chat('1.8.9')
  const app = express()
  const server = createServer(app)
  const config = getConfig()

  startRpc(config.rpc)
  startBot()
  startWebhook(config.webhook.url)
  function startBot (): void {
    const bot = createBot({
      username: 'CoffeeL',
      host: 'mc.hypixel.net',
      version: '1.8.9',
      auth: 'microsoft',
      viewDistance: 'tiny',
      profilesFolder: './profiles',
      onMsaCode
    }) as CoffeeL

    bot.coffeel = {
      start: async () => {},
      restart: async () => {}
    }

    bot.coffeel.start = async () => {
      await tpToSkyblock(bot, config)
      syncTimeout(5000, async () => {
        await tpToIsland(bot, config)
      })

      islandCheckInterval = setInterval(async () => {
        const inIsland = await isIsland(bot)
        if (!inIsland) {
          log('We are not in our island, teleporting in 10 seconds')
          syncTimeout(10000, async () => {
            await tpToLobby(bot)
            syncTimeout(5000, async () => {
              await tpToSkyblock(bot, config)
              syncTimeout(5000, async () => {
                await tpToIsland(bot, config)
              })
            })
          })
        } else {
          log('We are still in our island')
        }
      }, 60 * 1000)
    }

    bot.coffeel.restart = async (reason) => {
      kickedRetries++

      if (reason != null) {
        const msg = builder.fromNotch(reason).toString()
        const lines = msg.toString().split('\n')
        for (const line of lines) {
          log(line, 'ERROR')
        }
      }

      if (islandCheckInterval != null) {
        clearInterval(islandCheckInterval)
      }

      bot.removeAllListeners('error')
      bot.removeAllListeners('message')
      bot.removeAllListeners('physicsTick')
      bot.removeAllListeners('spawn')
      if (kickedRetries > 5) {
        log('Too many kicks, stopping')
        exitProcess()
      }

      log(`Kicked, restarting bot in 5 seconds (retry number ${kickedRetries}/5)`)
      await sleep(5000)
      startBot()
    }

    bot.once('spawn', async () => {
      await bot.waitForChunksToLoad()
      log('Bot spawned, teleporting to SkyBlock')
      handleMessage(bot)

      await bot.coffeel.start()
    })

    bot.on('error', async (error) => {
      const str = error.message
      log(str, 'ERROR')
      if (shouldRestart(str)) {
        await bot.coffeel.restart(str)
      }
    })

    bot.once('kicked', async (reason) => {
      await bot.coffeel.restart(reason)
    })
  }

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  for (const route of routes) {
    app.use(route.path, route.router)
    log(`Loaded route ${routes.indexOf(route) + 1}/${routes.length}`)
  }

  server.listen(config.webpage.port, () => {
    log('Webserver started')
  })

  server.on('error', (error) => {
    log(error.message, 'ERROR')
  })
}

startCoffeeL()
