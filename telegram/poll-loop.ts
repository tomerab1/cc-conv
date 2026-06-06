import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { TelegramConfig } from './types.ts'
import { pushToSession } from '../bridge/channel-server.ts'
import { getUpdates } from './telegram-client.ts'
import { extractMessage, shouldHandle, stripMention } from './routing.ts'
import { parseVerdict } from './permission.ts'

const ERROR_BACKOFF_MS = 2000

export function startPolling(server: Server, config: TelegramConfig, botUsername: string): () => void {
  let offset = 0
  let running = true

  async function deliver(text: string, chatId: number, fromId: number): Promise<void> {
    await pushToSession(server, text, { chat_id: String(chatId), from: String(fromId) })
  }

  async function pollOnce(): Promise<void> {
    const updates = await getUpdates(config, offset)
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1)
      const message = extractMessage(update)
      if (!message) continue
      if (!shouldHandle(message, { botUsername, allowedUserId: config.allowedUserId })) continue
      process.stderr.write(`[telegram] handling message from ${message.fromId} in ${message.chatType}\n`)
      const text = stripMention(message.text, botUsername)
      const verdict = parseVerdict(text)
      if (verdict) {
        await server.notification({
          method: 'notifications/claude/channel/permission',
          params: { request_id: verdict.requestId, behavior: verdict.behavior },
        })
        continue
      }
      await deliver(text, message.chatId, message.fromId)
    }
  }

  async function loop(): Promise<void> {
    while (running) {
      try {
        await pollOnce()
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        process.stderr.write(`[telegram] poll error: ${reason}\n`)
        await new Promise((resolve) => setTimeout(resolve, ERROR_BACKOFF_MS))
      }
    }
  }

  void loop()
  return () => {
    running = false
  }
}
