import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { TelegramConfig, TelegramMessage } from './types.ts'
import { pushToSession } from '../bridge/channel-server.ts'
import { downloadPhoto, getUpdates } from './telegram-client.ts'
import { extractMessage, shouldHandle, stripMention } from './routing.ts'
import { parseVerdict } from './permission.ts'

const ERROR_BACKOFF_MS = 2000

export function startPolling(server: Server, config: TelegramConfig, botUsername: string): () => void {
  let offset = 0
  let running = true

  async function deliver(message: TelegramMessage, text: string): Promise<void> {
    const meta: Record<string, string> = { chat_id: String(message.chatId), from: String(message.fromId) }
    if (message.photoFileId) {
      const imagePath = await downloadPhoto(config, message.photoFileId)
      if (imagePath) meta.image_path = imagePath
    }
    await pushToSession(server, text || '(image)', meta)
  }

  async function pollOnce(): Promise<void> {
    const updates = await getUpdates(config, offset)
    if (updates.length) process.stderr.write(`[telegram] got ${updates.length} update(s)\n`)
    for (const update of updates) {
      offset = Math.max(offset, update.update_id + 1)
      const message = extractMessage(update)
      if (!message) continue
      if (!shouldHandle(message, { botUsername, allowedUserId: config.allowedUserId })) {
        process.stderr.write(
          `[telegram] ignored msg from ${message.fromId} in ${message.chatType}: "${message.text.slice(0, 50)}"\n`,
        )
        continue
      }
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
      await deliver(message, text)
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
