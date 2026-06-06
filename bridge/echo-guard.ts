import type { EchoGuard, PeerMessage } from './types.ts'

const ECHO_TTL_MS = 10_000

export function createEchoGuard(): EchoGuard {
  const sentAt = new Map<string, number>()

  function prune(now: number): void {
    for (const [msgId, ts] of sentAt) {
      if (now - ts > ECHO_TTL_MS) sentAt.delete(msgId)
    }
  }

  return {
    remember(msgId: string): void {
      sentAt.set(msgId, Date.now())
    },
    isEcho(message: PeerMessage, selfName: string): boolean {
      if (message.from === selfName) return true
      prune(Date.now())
      return sentAt.has(message.msgId)
    },
  }
}
