export interface TelegramConfig {
  agentName: string
  token: string
  allowedUserId: number
  apiBase: string
  chatId: number | null
}

export interface MessageEntity {
  type: string
  offset: number
  length: number
}

export interface TelegramMessage {
  messageId: number
  chatId: number
  fromId: number
  text: string
  entities: MessageEntity[]
  replyToBotUsername: string | null
}

export interface RawUpdate {
  update_id: number
  message?: {
    message_id?: number
    chat?: { id?: number }
    from?: { id?: number }
    text?: string
    entities?: MessageEntity[]
    reply_to_message?: { from?: { is_bot?: boolean; username?: string } }
  }
}
