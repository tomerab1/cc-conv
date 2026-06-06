import test from 'node:test'
import assert from 'node:assert/strict'
import { handleReply } from '../telegram/reply-tool.ts'

test('sends and reports success for valid args', async () => {
  const sent: Array<{ chatId: number; text: string }> = []
  const result = await handleReply({ chat_id: 7, text: 'hi' }, async (chatId, text) => {
    sent.push({ chatId, text })
  })
  assert.deepEqual(sent, [{ chatId: 7, text: 'hi' }])
  assert.equal(result.isError, undefined)
  assert.equal(result.content[0]?.text, 'sent')
})

test('rejects missing text without sending', async () => {
  let called = false
  const result = await handleReply({ chat_id: 7 }, async () => {
    called = true
  })
  assert.equal(called, false)
  assert.equal(result.isError, true)
})

test('reports a send failure', async () => {
  const result = await handleReply({ chat_id: 7, text: 'hi' }, async () => {
    throw new Error('network down')
  })
  assert.equal(result.isError, true)
  assert.match(result.content[0]?.text ?? '', /network down/)
})
