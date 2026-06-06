import test from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../telegram/config.ts'

const BASE: Record<string, string> = {
  AGENT_NAME: 'server',
  ALLOWED_USER_ID: '42',
  TELEGRAM_TOKEN: 'tok',
}

function withEnv(env: Record<string, string | undefined>, run: () => void): void {
  const saved: Record<string, string | undefined> = {}
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key]
    if (env[key] === undefined) delete process.env[key]
    else process.env[key] = env[key]
  }
  try {
    run()
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }
}

test('loads config from env', () => {
  withEnv(BASE, () => {
    const config = loadConfig()
    assert.equal(config.agentName, 'server')
    assert.equal(config.allowedUserId, 42)
    assert.equal(config.token, 'tok')
    assert.equal(config.apiBase, 'https://api.telegram.org')
  })
})

test('throws without AGENT_NAME', () => {
  withEnv({ ...BASE, AGENT_NAME: undefined }, () => assert.throws(() => loadConfig(), /AGENT_NAME/))
})

test('rejects a non-numeric user id', () => {
  withEnv({ ...BASE, ALLOWED_USER_ID: 'abc' }, () => assert.throws(() => loadConfig(), /allowed user id/i))
})
