import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.ts'
import { createTelegramServer, registerPermissionRelay, registerReplyTool } from './channel.ts'
import { getBotUsername, sendMessage } from './telegram-client.ts'
import { startPolling } from './poll-loop.ts'

const config = loadConfig()
const botUsername = await getBotUsername(config)
process.stderr.write(`[telegram] started as @${botUsername} (agent ${config.agentName}, relay ${config.chatId !== null})\n`)
const server = createTelegramServer(config.chatId !== null)

registerReplyTool(server, config)
if (config.chatId !== null) {
  const chatId = config.chatId
  registerPermissionRelay(server, chatId, (id, text) => sendMessage(config, id, text))
}

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
