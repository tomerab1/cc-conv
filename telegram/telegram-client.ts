import type { RawUpdate, TelegramConfig } from './types.ts'

export function apiUrl(config: TelegramConfig, method: string): string {
  return `${config.apiBase}/bot${config.token}/${method}`
}

export async function getBotUsername(config: TelegramConfig): Promise<string> {
  const response = await fetch(apiUrl(config, 'getMe'))
  const data = (await response.json()) as { result?: { username?: string } }
  return data.result?.username ?? ''
}

export async function getUpdates(config: TelegramConfig, offset: number): Promise<RawUpdate[]> {
  const response = await fetch(`${apiUrl(config, 'getUpdates')}?timeout=50&offset=${offset}`)
  const data = (await response.json()) as { result?: RawUpdate[] }
  return data.result ?? []
}

export async function sendMessage(config: TelegramConfig, chatId: number, text: string): Promise<void> {
  await fetch(apiUrl(config, 'sendMessage'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
