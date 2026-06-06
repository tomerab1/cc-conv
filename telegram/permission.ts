export interface Verdict {
  requestId: string
  behavior: 'allow' | 'deny'
}

const VERDICT_PATTERN = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i

export function parseVerdict(text: string): Verdict | null {
  const match = VERDICT_PATTERN.exec(text)
  if (!match) return null
  return {
    requestId: match[2]!.toLowerCase(),
    behavior: match[1]!.toLowerCase().startsWith('y') ? 'allow' : 'deny',
  }
}

export interface PermissionRequestParams {
  request_id: string
  tool_name: string
  description: string
  input_preview: string
}

export function formatPermissionPrompt(params: PermissionRequestParams): string {
  const preview = params.input_preview ? `\n${params.input_preview}` : ''
  return (
    `🔐 Claude wants to run ${params.tool_name}: ${params.description}` +
    preview +
    `\n\nReply "yes ${params.request_id}" or "no ${params.request_id}"`
  )
}
