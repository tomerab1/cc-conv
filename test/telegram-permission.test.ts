import test from 'node:test'
import assert from 'node:assert/strict'
import { formatPermissionPrompt, parseVerdict } from '../telegram/permission.ts'

test('parses an allow verdict', () => {
  assert.deepEqual(parseVerdict('yes abcde'), { requestId: 'abcde', behavior: 'allow' })
})

test('parses a deny verdict and lowercases the id', () => {
  assert.deepEqual(parseVerdict('NO ABCDE'), { requestId: 'abcde', behavior: 'deny' })
})

test('rejects non-verdict text', () => {
  assert.equal(parseVerdict('approve it'), null)
})

test('rejects a wrong-length id', () => {
  assert.equal(parseVerdict('yes abcdef'), null)
})

test('rejects an id containing the letter l', () => {
  assert.equal(parseVerdict('yes ablde'), null)
})

test('formats a prompt with the tool name and id', () => {
  const text = formatPermissionPrompt({
    request_id: 'abcde',
    tool_name: 'Bash',
    description: 'run ls',
    input_preview: 'ls -la',
  })
  assert.match(text, /Bash/)
  assert.match(text, /abcde/)
})
