import http from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { BridgeConfig, EchoGuard, PeerMessage } from './types.ts'
import { pushToSession } from './channel-server.ts'

function secretMatches(provided: string | undefined, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function headerValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw
}

function readBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    request.on('data', (chunk) => (body += chunk))
    request.on('end', () => resolve(body))
  })
}

function parseMessage(raw: string): PeerMessage | null {
  try {
    const data = JSON.parse(raw) as Partial<PeerMessage>
    if (!data.from || !data.msgId || !data.text) return null
    return { from: data.from, msgId: data.msgId, ts: data.ts ?? '', text: data.text }
  } catch {
    return null
  }
}

export function startInboundServer(
  server: Server,
  config: BridgeConfig,
  echoGuard: EchoGuard,
): http.Server {
  const handle = async (request: http.IncomingMessage, response: http.ServerResponse) => {
    if (!secretMatches(headerValue(request.headers['x-bridge-secret']), config.secret)) {
      response.writeHead(403).end('forbidden\n')
      return
    }

    const message = parseMessage(await readBody(request))
    if (!message) {
      response.writeHead(400).end('bad request\n')
      return
    }

    if (echoGuard.isEcho(message, config.selfName)) {
      response.writeHead(208).end('echo ignored\n')
      return
    }

    await pushToSession(server, message.text, {
      from: message.from,
      msg_id: message.msgId,
      ts: message.ts,
    })
    response.writeHead(200).end('ok\n')
  }

  return http.createServer(handle).listen(config.selfPort, '127.0.0.1')
}
