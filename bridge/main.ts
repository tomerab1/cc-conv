import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.ts'
import { createChannelServer } from './channel-server.ts'
import { createEchoGuard } from './echo-guard.ts'
import { registerSendTool } from './send-tool.ts'
import { startInboundServer } from './inbound-server.ts'

const config = loadConfig()
const server = createChannelServer(config.peerName)
const echoGuard = createEchoGuard()

registerSendTool(server, config, echoGuard)

await server.connect(new StdioServerTransport())
const inbound = startInboundServer(server, config, echoGuard)

function shutdown(): void {
  inbound.close()
  void server.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.stdin.on('end', shutdown)
