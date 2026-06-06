export interface ReplyArgs {
  chat_id?: unknown
  text?: unknown
}

export interface ToolResult {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

type Send = (chatId: number, text: string) => Promise<void>

export async function handleReply(args: ReplyArgs | undefined, send: Send): Promise<ToolResult> {
  const chatId = Number(args?.chat_id)
  const text = typeof args?.text === 'string' ? args.text : ''

  if (!Number.isFinite(chatId) || !text) {
    return { content: [{ type: 'text', text: 'reply_to_telegram needs chat_id and text.' }], isError: true }
  }

  try {
    await send(chatId, text)
    return { content: [{ type: 'text', text: 'sent' }] }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { content: [{ type: 'text', text: `Telegram send failed: ${reason}` }], isError: true }
  }
}
