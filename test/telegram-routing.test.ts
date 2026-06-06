import test from 'node:test'
import assert from 'node:assert/strict'
import { extractMessage, shouldHandle, stripMention } from '../telegram/routing.ts'
import type { RawUpdate } from '../telegram/types.ts'

type RawMessage = NonNullable<RawUpdate['message']>

function update(overrides: Partial<RawMessage> = {}): RawUpdate {
  return {
    update_id: 1,
    message: { message_id: 5, chat: { id: -100 }, from: { id: 42 }, text: 'hello', ...overrides },
  }
}

const opts = { botUsername: 'server_bot', allowedUserId: 42 }

test('extractMessage returns null for a non-text update', () => {
  assert.equal(extractMessage({ update_id: 1 }), null)
})

test('extractMessage parses a text message', () => {
  const message = extractMessage(update())
  assert.equal(message?.text, 'hello')
  assert.equal(message?.fromId, 42)
  assert.equal(message?.chatId, -100)
})

test('extractMessage captures the replied-to bot username', () => {
  const message = extractMessage(update({ reply_to_message: { from: { is_bot: true, username: 'server_bot' } } }))
  assert.equal(message?.replyToBotUsername, 'server_bot')
})

test('shouldHandle rejects a different sender', () => {
  const message = extractMessage(update({ text: '@server_bot do x', from: { id: 999 } }))!
  assert.equal(shouldHandle(message, opts), false)
})

test('shouldHandle accepts a mention from the allowed user', () => {
  const message = extractMessage(update({ text: '@server_bot do x' }))!
  assert.equal(shouldHandle(message, opts), true)
})

test('shouldHandle ignores a message with neither mention nor reply', () => {
  const message = extractMessage(update({ text: 'just chatting' }))!
  assert.equal(shouldHandle(message, opts), false)
})

test('shouldHandle accepts a reply to our bot', () => {
  const message = extractMessage(
    update({ text: 'thanks', reply_to_message: { from: { is_bot: true, username: 'server_bot' } } }),
  )!
  assert.equal(shouldHandle(message, opts), true)
})

test('stripMention removes the bot tag', () => {
  assert.equal(stripMention('@server_bot do x', 'server_bot'), 'do x')
})

test('shouldHandle accepts any message from the allowed user in a DM', () => {
  const message = extractMessage(update({ chat: { id: 42, type: 'private' }, text: 'do x' }))!
  assert.equal(shouldHandle(message, opts), true)
})

test('shouldHandle rejects a DM from a different user', () => {
  const message = extractMessage(update({ chat: { id: 999, type: 'private' }, from: { id: 999 }, text: 'do x' }))!
  assert.equal(shouldHandle(message, opts), false)
})
