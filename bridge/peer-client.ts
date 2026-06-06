import { randomUUID } from 'node:crypto'
import type { BridgeConfig, PeerMessage } from './types.ts'

export async function sendToPeer(config: BridgeConfig, text: string): Promise<PeerMessage> {
  const message: PeerMessage = {
    from: config.selfName,
    msgId: randomUUID(),
    ts: new Date().toISOString(),
    text,
  }

  const response = await fetch(config.peerUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bridge-secret': config.secret,
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    throw new Error(`peer responded ${response.status} ${response.statusText}`)
  }
  return message
}
