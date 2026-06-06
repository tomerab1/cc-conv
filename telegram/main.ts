import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.ts'
import { createTelegramServer, registerReplyTool } from './channel.ts'
import { getBotUsername } from './telegram-client.ts'
import { startPolling } from './poll-loop.ts'

const config = loadConfig()
const botUsername = await getBotUsername(config)
const server = createTelegramServer()

registerReplyTool(server, config)

await server.connect(new StdioServerTransport())
const stopPolling = startPolling(server, config, botUsername)

function shutdown(): void {
  stopPolling()
  void server.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.stdin.on('end', shutdown)
