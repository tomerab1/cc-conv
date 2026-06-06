import { resolve } from 'node:path'
import { isDeniedCommand, isOutsideProject, isProtectedPath } from './rules.ts'

interface HookInput {
  tool_name?: string
  tool_input?: Record<string, unknown>
}

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])
const projectRoot = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.on('data', (chunk) => (data += chunk))
    process.stdin.on('end', () => resolve(data))
  })
}

function parseInput(raw: string): HookInput {
  try {
    return JSON.parse(raw) as HookInput
  } catch {
    return {}
  }
}

function block(reason: string): never {
  process.stderr.write(`[firewall] blocked: ${reason}\n`)
  process.exit(2)
}

function checkBash(input: Record<string, unknown>): void {
  const command = String(input.command ?? '')
  if (isDeniedCommand(command)) block(`command matches a denied pattern: ${command}`)
}

function checkEdit(input: Record<string, unknown>): void {
  const path = String(input.file_path ?? input.notebook_path ?? '')
  if (!path) return
  if (isProtectedPath(path)) block(`write to a protected path: ${path}`)
  if (isOutsideProject(projectRoot, path)) block(`write outside the project root: ${path}`)
}

const { tool_name = '', tool_input = {} } = parseInput(await readStdin())

if (tool_name === 'Bash') checkBash(tool_input)
else if (EDIT_TOOLS.has(tool_name)) checkEdit(tool_input)

process.exit(0)
