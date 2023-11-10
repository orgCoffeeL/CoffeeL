import axios from 'axios'
import { log } from './utils.js'

let webhook: null | string = null
let queuedMessages: string[] = []
let messageInterval: NodeJS.Timer | null = null
const webhookRegex = /(.+)discord\.com\/api\/webhooks\/(.+)\/(.+)/

function queueMessage (message: string): void {
  if (webhook == null) return
  queuedMessages.push(message)
}

function sendQueuedMessages (): void {
  if (webhook == null) return
  if (queuedMessages.length > 0) {
    const msg = `\`\`\`\n${queuedMessages.join('\n')}\n\`\`\``
    sendMessage({
      username: 'CoffeeL Webhook',
      avatar_url: 'https://i.imgur.com/EJZ1jF5.png',
      content: msg
    })

    queuedMessages = []
  }
}

function startWebhook (url: string): void {
  if (url == null || url === '') return

  const match = webhookRegex.test(url)
  if (!match) {
    log('Invalid webhook URL', 'ERROR')
    return
  }

  webhook = url

  if (messageInterval != null) clearInterval(messageInterval)
  messageInterval = setInterval(() => {
    sendQueuedMessages()
  }, 5000)
}

function sendMessage (content: any): void {
  if (webhook == null) return
  axios.post(webhook, content)
}

function makeEmbed (title: string, description: string, url: string | null = null, thumbURL: string | null = 'https://i.imgur.com/EJZ1jF5.png', color: number = 0xffffff, fields: any[] = []): any {
  return {
    username: 'CoffeeL Webhook',
    avatar_url: 'https://i.imgur.com/EJZ1jF5.png',
    embeds: [{
      url: url == null ? null : url,
      author: {
        name: 'CoffeeL',
        iconURL: 'https://i.imgur.com/EJZ1jF5.png',
        url: 'https://discord.gg/JyXv99Jaq4'
      },
      title,
      description: description === '' ? null : description.slice(0, 2000),
      thumbnail: {
        url: thumbURL
      },
      color,
      timestamp: new Date(),
      fields,
      footer: {
        text: 'Always here for you'
      }
    }]
  }
}

export {
  startWebhook,
  sendMessage,
  queueMessage,
  sendQueuedMessages,
  makeEmbed
}
