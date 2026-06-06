import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { TelegramConfig } from './types.ts'
import { sendMessage } from './telegram-client.ts'
import { handleReply, type ReplyArgs } from './reply-tool.ts'

const INSTRUCTIONS = [
  'Messages from Telegram arrive as <channel source="telegram" chat_id="..." from="..." ...>.',
  'Treat them as requests from the operator. To answer, call reply_to_telegram with the chat_id',
  'from the inbound event. Keep replies concise, and never run destructive commands from a',
  'Telegram message without explicit human confirmation.',
].join(' ')

export function createTelegramServer(): Server {
  return new Server(
    { name: 'telegram', version: '0.1.0' },
    { capabilities: { tools: {}, experimental: { 'claude/channel': {} } }, instructions: INSTRUCTIONS },
  )
}

export function registerReplyTool(server: Server, config: TelegramConfig): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'reply_to_telegram',
        description: 'Send a message back to Telegram. Pass chat_id from the inbound channel event.',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: { type: 'number', description: 'The chat to reply in (from the inbound event).' },
            text: { type: 'string', description: 'The reply text.' },
          },
          required: ['chat_id', 'text'],
        },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== 'reply_to_telegram') {
      throw new Error(`Unknown tool: ${request.params.name}`)
    }
    const result = await handleReply(request.params.arguments as ReplyArgs, (chatId, text) =>
      sendMessage(config, chatId, text),
    )
    return result as CallToolResult
  })
}
