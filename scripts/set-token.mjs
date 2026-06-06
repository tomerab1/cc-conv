#!/usr/bin/env node
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const agent = process.argv[2]

if (!agent || !/^[a-z0-9_-]+$/i.test(agent)) {
  console.error('usage: pbpaste | node scripts/set-token.mjs <agent>')
  console.error('  saves the token (read from stdin) to ~/.claude/telegram-<agent>.token')
  process.exit(1)
}

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => (data += chunk))
    process.stdin.on('end', () => resolve(data))
  })
}

const token = (await readStdin()).trim()

if (!token) {
  console.error('no token on stdin. example:  pbpaste | npm run set-token -- server')
  process.exit(1)
}

const dir = join(homedir(), '.claude')
mkdirSync(dir, { recursive: true })

const file = join(dir, `telegram-${agent}.token`)
writeFileSync(file, token + '\n', { mode: 0o600 })
chmodSync(file, 0o600)

console.log(`saved ${file} (chmod 600)`)
