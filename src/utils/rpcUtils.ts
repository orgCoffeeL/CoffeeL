import { Client } from 'discord-rpc'
import axios from 'axios'
import { log } from './utils.js'
import { CoffeeResponse } from './constants.js'

const coffeeTypes = [
  'Espresso',
  'Double Espresso',
  'Cappuccino',
  'Ristretto',
  'Short Macchiato',
  'Long Macchiato',
  'Affogato',
  'Latte',
  'Mocha',
  'Caramel Macchiato',
  'Americano',
  'Iced Coffee'
]

function startRpc (shouldStart: boolean): void {
  if (!shouldStart) return
  const client = new Client({
    transport: 'ipc'
  })

  client.on('ready', async () => {
    const randomCoffee = coffeeTypes[Math.floor(Math.random() * coffeeTypes.length)]

    client.setActivity({
      details: randomCoffee,
      state: 'is the best way to start your day',
      startTimestamp: Date.now(),
      largeImageKey: await getRandomCoffee(),
      largeImageText: 'CoffeeL',
      smallImageKey: 'coffeel',
      smallImageText: '99.1% pure coffee',
      instance: false,
      buttons: [
        {
          label: 'Discord',
          url: 'https://discord.gg/JyXv99Jaq4'
        }
      ]
    }).catch(err => {
      log(`Failed to set RPC activity: ${err ?? 'Unknown error'}`, 'ERROR')
    })

    log('Discord RPC started')
  })

  client.login({ clientId: '1025432869373493391' }).catch(err => {
    log(`Failed to log in with RPC: ${err ?? 'Unknown error'}`, 'ERROR')
  })
}

async function getRandomCoffee (): Promise<string> {
  const res = await axios.get('https://coffee.alexflipnote.dev/random.json').catch(err => {
    log(`Failed to get random coffee: ${err ?? 'Unknown error'}`, 'ERROR')
    return {
      data: {
        file: 'https://i.imgur.com/EJZ1jF5.png'
      }
    }
  })

  return (res.data as CoffeeResponse).file
}

export {
  startRpc
}
