import { writeFileSync } from 'fs'
import { CoffeeL, CoffeeLConfig } from '../utils/constants.js'
import { exitProcess, log, sleep, syncTimeout } from '../utils/utils.js'

let tpRetries = 0
const locationRegex = /"map":"(.+)"}/
const errorMessages = [
  'There was a problem',
  'Please don\'t spam',
  'Something went wrong',
  'Cannot join',
  'Error',
  'Try again',
  'You tried to rejoin too fast',
  'A kick ocurred',
  'SkyBlock is currently undergoing emergency maintenance',
  'slow down',
  'You were kicked while joining',
  'A disconnect occurred',
  'You were spawned in Limbo'
]

const lobbySuccessMessages = [
  'You are already connected'
]

const successMessages = [
  'Couldn\'t warp you! Try again later. (ALREADY_IN_ISLAND_TYPE)',
  'You are already there'
]

async function tpToSkyblock (bot: CoffeeL, config: CoffeeLConfig): Promise<void> {
  return await new Promise<void>(async (resolve, reject) => {
    bot.on('messagestr', onMessage)

    async function onMessage (msg: string): Promise<void> {
      if (msg.includes('Welcome to Hypixel SkyBlock')) {
        log('Successfully joined Skyblock')
        bot.removeListener('messagestr', onMessage)

        // async function waitForHub () {
        //   const inHub = await tpToHub(bot)
        //   if (!inHub) {
        //     log('Failed to join Hub, trying again in 5s', 'ERROR')
        //     await sleep(5000)
        //     await waitForHub()
        //   }
        // }

        // await waitForHub()
        // log('Successfully joined Hub')

        resolve()
      } else if (isErrorMessage(msg)) {
        tpRetries++
        if (tpRetries >= 10) {
          log('Failed to join Skyblock, stopping program', 'ERROR')
          exitProcess()
        } else {
          log(`Failed to join Skyblock, trying again in 20s (retry number ${tpRetries}/10)`, 'ERROR')
        }

        bot.removeListener('messagestr', onMessage)

        syncTimeout(20000, async () => {
          await tpToLobby(bot)
          syncTimeout(20000, async () => {
            await tpToSkyblock(bot, config)
            syncTimeout(5000, async () => {
              await tpToIsland(bot, config)
            })
          })
        })
      }
    }

    await sleep(500)
    bot.chat('/play sb')
  })
}

// async function tpToHub (bot: CoffeeL): Promise<boolean> {
//   return await new Promise(async (resolve, reject) => {
//     const timeout = setTimeout(() => {
//       bot.removeListener('messagestr', onMessage)
//       resolve(false)
//     }, 10000)

//     bot.on('messagestr', onMessage)

//     function onMessage (msg: string) {
//       const matches = msg.match(locationRegex)
//       if (matches != null) {
//         if (matches[1] === 'Hub') {
//           clearTimeout(timeout)
//           bot.removeListener('messagestr', onMessage)
//           resolve(true)
//         }
//       }
//     }

//     await sleep(500)
//     bot.chat('/hub')
//     await sleep(1500)
//     bot.chat('/locraw')
//   })
// }

async function tpToIsland (bot: CoffeeL, config: CoffeeLConfig): Promise<void> {
  return await new Promise<void>(async (resolve, reject) => {
    let successful = false
    bot.on('messagestr', onMessage)
    async function onMessage (msg: string): Promise<void> {
      if (isSuccessMessage(msg)) {
        successful = true
        bot.removeListener('messagestr', onMessage)
        resolve()
      }
    }

    await sleep(500)

    if (config.visit.enabled && config.visit.username !== '') {
      log(`Teleporting to ${config.visit.username}'s Island`)
      bot.chat(`/visit ${config.visit.username}`)
      await handleWindow(bot)
    } else {
      log('Teleporting to Island')
      bot.chat('/is')
    }

    const result = await waitForIsland(bot)
    if (successful) {
      log('Arrived at Island')
      resolve()
      return
    }

    if (!result) {
      tpRetries++
      if (tpRetries >= 10) {
        log('Failed to teleport to island, stopping program', 'ERROR')
        exitProcess()
      } else {
        log(`Failed to teleport to island, trying again in 20s (retry number ${tpRetries}/10)`, 'ERROR')
      }

      syncTimeout(20000, async () => {
        await tpToIsland(bot, config)
      })
    } else {
      log('Arrived at Island')
      resolve()
    }
  })
}

async function handleWindow (bot: CoffeeL): Promise<void> {
  return await new Promise<void>((resolve, reject) => {
    bot.once('windowOpen', async (window) => {
      const item = window.slots.find(item => item?.name === 'skull')
      const slot = item?.slot

      if (slot == null) {
        log('Failed to find TP item, you probably should report this attaching the window.json file', 'ERROR')
        writeFileSync('window.json', JSON.stringify(window, null, 2))
        exitProcess()
        return
      }

      log('Clicking TP item')
      window.requiresConfirmation = false
      await bot.simpleClick.leftMouse(slot).catch(err => {
        log(`Failed to click TP item: ${err.message}`, 'ERROR')
        exitProcess()
      })

      resolve()
    })
  })
}

async function tpToLobby (bot: CoffeeL): Promise<void> {
  return await new Promise<void>((resolve, reject) => {
    bot.on('messagestr', onLobbyMsg)
    bot.once('spawn', onSpawn)

    async function onLobbyMsg (msg: string): Promise<void> {
      if (isLobbySuccessMessage(msg)) {
        bot.removeListener('messagestr', onLobbyMsg)
        bot.removeListener('spawn', onSpawn)
        await sleep(1000)
        log('Successfully arrived at Lobby')
        resolve()
      }
    }

    async function onSpawn (): Promise<void> {
      bot.removeListener('messagestr', onLobbyMsg)
      bot.removeListener('spawn', onSpawn)
      await sleep(1000)
      log('Successfully arrived at Lobby')
      resolve()
    }

    log('Teleporting to Lobby')
    bot.chat('/l')
  })
}

async function waitForIsland (bot: CoffeeL): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bot.removeListener('messagestr', onMsg)
      resolve(false)
    }, 5000)

    bot.on('forcedMove', onForcedMove)

    async function onForcedMove (): Promise<void> {
      log('Forced move detected, checking if we are in our island')
      bot.removeListener('forcedMove', onForcedMove)
      await sleep(500)
      bot.on('messagestr', onMsg)
      bot.chat('/locraw')
    }

    function onMsg (msg: string): void {
      const matches = msg.match(locationRegex)
      if (matches != null) {
        if (matches[1] === 'Private Island') {
          clearTimeout(timeout)
          bot.removeListener('messagestr', onMsg)
          resolve(true)
        } else {
          resolve(false)
        }
      }
    }
  })
}

function isSuccessMessage (msg: string): boolean {
  return successMessages.some((success) => msg.includes(success))
}

function isLobbySuccessMessage (msg: string): boolean {
  return lobbySuccessMessages.some((success) => msg.includes(success))
}

function isErrorMessage (msg: string): boolean {
  return errorMessages.some((error) => msg.includes(error))
}

export {
  tpToSkyblock,
  tpToIsland,
  tpToLobby
}
