import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
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

async function getFilePath(config: TelegramConfig, fileId: string): Promise<string | null> {
  const response = await fetch(`${apiUrl(config, 'getFile')}?file_id=${encodeURIComponent(fileId)}`)
  const data = (await response.json()) as { result?: { file_path?: string } }
  return data.result?.file_path ?? null
}

function imageDir(): string {
  return join(process.env.CLAUDE_PROJECT_DIR ?? tmpdir(), '.cc-telegram')
}

export async function downloadPhoto(config: TelegramConfig, fileId: string): Promise<string | null> {
  const filePath = await getFilePath(config, fileId)
  if (!filePath) return null

  const response = await fetch(`${config.apiBase}/file/bot${config.token}/${filePath}`)
  if (!response.ok) return null

  const bytes = Buffer.from(await response.arrayBuffer())
  const dir = imageDir()
  mkdirSync(dir, { recursive: true })
  const dest = join(dir, `${fileId.replace(/[^A-Za-z0-9]/g, '')}${extname(filePath) || '.jpg'}`)
  writeFileSync(dest, bytes)
  return dest
}
