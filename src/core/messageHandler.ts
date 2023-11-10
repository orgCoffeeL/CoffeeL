import { CoffeeL } from '../utils/constants.js'
import { getEasyConfig, log } from '../utils/utils.js'

const locationRegex = /"map":"(.+)"}/
const partyRegex = /(.+) has invited you to join their party!/
const config = getEasyConfig()

const ignoredMessages = [
  'HYPIXEL NETWORK',
  'Click to select a help option...',
  'Hypixel Minigames',
  'Found a Server Bug/Issue',
  'Report a Rule Breaker',
  'Store',
  'Support',
  'Allowed Modifications',
  'Hypixel Rules & Policies',
  'General Gameplay/Server',
  'Need more help? Visit our forums'
]

function handleMessage (bot: CoffeeL): void {
  bot.on('message', async (msg, position) => {
    const ansi = msg.toAnsi()
    const string = msg.toString()
    if (position === 'game_info' || isIgnoredMessage(string)) return
    if (!config.logging.logChat) return
    log(ansi, 'CHAT')

    if (!config['accept-party'].enabled) return
    if (partyRegex.test(string)) {
      const matches = string.match(partyRegex)
      if (matches != null) {
        const partyLeader = matches[1]
        bot.chat(`/p accept ${partyLeader}`)
      }
    }
  })
}

async function isIsland (bot: CoffeeL): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bot.removeListener('messagestr', onMsg)
      resolve(false)
    }, 5000)

    bot.on('messagestr', onMsg)
    bot.chat('/locraw')

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

function isIgnoredMessage (msg: string): boolean {
  return ignoredMessages.some(ignoredMsg => msg.includes(ignoredMsg))
}

export {
  handleMessage,
  isIsland
}
