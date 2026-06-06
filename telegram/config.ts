import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { TelegramConfig } from './types.ts'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function parseUserId(raw: string): number {
  const id = Number(raw)
  if (!Number.isInteger(id)) throw new Error(`Invalid ALLOWED_USER_ID: ${raw}`)
  return id
}

function loadToken(agentName: string): string {
  const fromEnv = process.env.TELEGRAM_TOKEN
  if (fromEnv) return fromEnv

  const file = join(homedir(), '.claude', `telegram-${agentName}.token`)
  try {
    const token = readFileSync(file, 'utf8').trim()
    if (token) return token
  } catch {}

  throw new Error(`No TELEGRAM_TOKEN env var and no readable token at ${file}`)
}

function parseChatId(): number | null {
  const raw = process.env.TELEGRAM_CHAT_ID
  if (!raw) return null
  const id = Number(raw)
  if (!Number.isInteger(id)) throw new Error(`Invalid TELEGRAM_CHAT_ID: ${raw}`)
  return id
}

export function loadConfig(): TelegramConfig {
  const agentName = required('AGENT_NAME')
  return {
    agentName,
    token: loadToken(agentName),
    allowedUserId: parseUserId(required('ALLOWED_USER_ID')),
    apiBase: process.env.TELEGRAM_API_BASE ?? 'https://api.telegram.org',
    chatId: parseChatId(),
  }
}
