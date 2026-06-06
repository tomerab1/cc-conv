import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { BridgeConfig, EchoGuard } from './types.ts'
import { sendToPeer } from './peer-client.ts'

const TOOL_NAME = 'send_to_peer'

function toolDefinition(peerName: string) {
  return {
    name: TOOL_NAME,
    description: `Send a message to the ${peerName} Claude Code session. It arrives there as a channel event and that session acts on it.`,
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: `The message to deliver to ${peerName}.` },
      },
      required: ['text'],
    },
  }
}

function extractText(args: unknown): string {
  const text = (args as { text?: unknown } | undefined)?.text
  return typeof text === 'string' ? text.trim() : ''
}

export function registerSendTool(server: Server, config: BridgeConfig, echoGuard: EchoGuard): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [toolDefinition(config.peerName)],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== TOOL_NAME) {
      throw new Error(`Unknown tool: ${request.params.name}`)
    }

    const text = extractText(request.params.arguments)
    if (!text) {
      return { content: [{ type: 'text', text: 'send_to_peer needs non-empty text.' }], isError: true }
    }

    try {
      const message = await sendToPeer(config, text)
      echoGuard.remember(message.msgId)
      return { content: [{ type: 'text', text: `Delivered to ${config.peerName}.` }] }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return {
        content: [{ type: 'text', text: `Could not reach ${config.peerName}: ${reason}` }],
        isError: true,
      }
    }
  })
}
