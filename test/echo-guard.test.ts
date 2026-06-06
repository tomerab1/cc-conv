import test from 'node:test'
import assert from 'node:assert/strict'
import { createEchoGuard } from '../bridge/echo-guard.ts'
import type { PeerMessage } from '../bridge/types.ts'

function message(overrides: Partial<PeerMessage> = {}): PeerMessage {
  return { from: 'server', msgId: 'm1', ts: '', text: 'hi', ...overrides }
}

test('treats a message whose sender is self as an echo', () => {
  const guard = createEchoGuard()
  assert.equal(guard.isEcho(message({ from: 'native' }), 'native'), true)
})

test('passes a genuine message from the peer', () => {
  const guard = createEchoGuard()
  assert.equal(guard.isEcho(message({ from: 'server' }), 'native'), false)
})

test('flags a message id we recently sent', () => {
  const guard = createEchoGuard()
  guard.remember('abc')
  assert.equal(guard.isEcho(message({ msgId: 'abc' }), 'native'), true)
})

test('does not flag an unseen message id', () => {
  const guard = createEchoGuard()
  guard.remember('abc')
  assert.equal(guard.isEcho(message({ msgId: 'xyz' }), 'native'), false)
})
