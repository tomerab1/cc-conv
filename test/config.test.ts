import test from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../bridge/config.ts'

const BASE: Record<string, string> = {
  SELF_NAME: 'server',
  PEER_NAME: 'native',
  SELF_PORT: '8801',
  PEER_URL: 'http://127.0.0.1:8802/',
  BRIDGE_SECRET: 'sekret',
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

test('loads a complete config from env', () => {
  withEnv(BASE, () => {
    const config = loadConfig()
    assert.equal(config.selfName, 'server')
    assert.equal(config.peerName, 'native')
    assert.equal(config.selfPort, 8801)
    assert.equal(config.peerUrl, 'http://127.0.0.1:8802/')
    assert.equal(config.secret, 'sekret')
  })
})

test('throws when a required var is missing', () => {
  withEnv({ ...BASE, SELF_NAME: undefined }, () => {
    assert.throws(() => loadConfig(), /SELF_NAME/)
  })
})

test('rejects an invalid port', () => {
  withEnv({ ...BASE, SELF_PORT: 'not-a-port' }, () => {
    assert.throws(() => loadConfig(), /SELF_PORT/)
  })
})
