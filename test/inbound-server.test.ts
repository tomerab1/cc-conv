import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { startInboundServer } from '../bridge/inbound-server.ts'
import { createEchoGuard } from '../bridge/echo-guard.ts'
import type { BridgeConfig } from '../bridge/types.ts'

interface Pushed {
  content: string
  meta: Record<string, string>
}

function stubServer(sink: Pushed[]): Server {
  const notification = async (n: { params: Pushed }) => {
    sink.push({ content: n.params.content, meta: n.params.meta })
  }
  return { notification } as unknown as Server
}

const config: BridgeConfig = {
  selfName: 'native',
  peerName: 'server',
  selfPort: 8911,
  peerUrl: 'http://127.0.0.1:8801/',
  secret: 'test-secret',
}

const url = `http://127.0.0.1:${config.selfPort}/`

function post(secret: string | null, body: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (secret !== null) headers['x-bridge-secret'] = secret
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
}

test('inbound server gates, parses, drops echoes, and pushes', async (t) => {
  const pushed: Pushed[] = []
  const server = startInboundServer(stubServer(pushed), config, createEchoGuard())
  await once(server, 'listening')
  t.after(() => server.close())

  const valid = { from: 'server', msgId: 'm1', ts: 't', text: 'hello' }
  const fromSelf = { from: 'native', msgId: 'm2', ts: 't', text: 'echo' }

  assert.equal((await post(null, valid)).status, 403, 'no secret -> 403')
  assert.equal((await post('wrong', valid)).status, 403, 'wrong secret -> 403')

  const badJson = await fetch(url, {
    method: 'POST',
    headers: { 'x-bridge-secret': config.secret },
    body: 'not json',
  })
  assert.equal(badJson.status, 400, 'bad json -> 400')

  assert.equal((await post(config.secret, valid)).status, 200, 'valid -> 200')
  assert.equal((await post(config.secret, fromSelf)).status, 208, 'echo -> 208')

  assert.equal(pushed.length, 1)
  assert.equal(pushed[0]?.content, 'hello')
  assert.equal(pushed[0]?.meta.from, 'server')
})
