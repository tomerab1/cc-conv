export interface BridgeConfig {
  selfName: string
  peerName: string
  selfPort: number
  peerUrl: string
  secret: string
}

export interface PeerMessage {
  from: string
  msgId: string
  ts: string
  text: string
}

export interface EchoGuard {
  remember(msgId: string): void
  isEcho(message: PeerMessage, selfName: string): boolean
}
