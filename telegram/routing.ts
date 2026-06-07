import type { RawUpdate, TelegramMessage } from './types.ts'

export function extractMessage(update: RawUpdate): TelegramMessage | null {
  const message = update.message
  if (!message || !message.chat?.id || !message.from?.id || !message.message_id) return null

  const text = message.text ?? message.caption ?? ''
  const photos = message.photo ?? []
  const photoFileId = photos.length ? photos[photos.length - 1]?.file_id ?? null : null
  if (!text && !photoFileId) return null

  const repliedTo = message.reply_to_message?.from
  return {
    messageId: message.message_id,
    chatId: message.chat.id,
    chatType: message.chat.type ?? '',
    fromId: message.from.id,
    text,
    entities: message.entities ?? [],
    replyToBotUsername: repliedTo?.is_bot ? repliedTo.username ?? null : null,
    photoFileId,
  }
}

export function mentionsBot(message: TelegramMessage, botUsername: string): boolean {
  return message.text.includes(`@${botUsername}`)
}

export function stripMention(text: string, botUsername: string): string {
  return text.replaceAll(`@${botUsername}`, '').trim()
}

export function shouldHandle(
  message: TelegramMessage,
  options: { botUsername: string; allowedUserId: number },
): boolean {
  if (message.fromId !== options.allowedUserId) return false
  if (message.chatType === 'private') return true
  return mentionsBot(message, options.botUsername) || message.replyToBotUsername === options.botUsername
}
