import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { BridgeConfig } from './types.ts'

const SECRET_FILE = join(homedir(), '.claude', 'bridge-secret')

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function parsePort(raw: string): number {
  const port = Number(raw)
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid SELF_PORT: ${raw}`)
  }
  return port
}

function loadSecret(): string {
  const fromEnv = process.env.BRIDGE_SECRET
  if (fromEnv) return fromEnv

  const fromFile = readSecretFile()
  if (fromFile) return fromFile

  throw new Error(`No BRIDGE_SECRET env var and no readable secret at ${SECRET_FILE}`)
}

function readSecretFile(): string | null {
  try {
    return readFileSync(SECRET_FILE, 'utf8').trim() || null
  } catch {
    return null
  }
}

export function loadConfig(): BridgeConfig {
  return {
    selfName: required('SELF_NAME'),
    peerName: required('PEER_NAME'),
    selfPort: parsePort(required('SELF_PORT')),
    peerUrl: required('PEER_URL'),
    secret: loadSecret(),
  }
}
