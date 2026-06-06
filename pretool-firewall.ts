import { resolve, sep } from 'node:path'
import { homedir } from 'node:os'

interface HookInput {
  tool_name?: string
  tool_input?: Record<string, unknown>
}

const projectRoot = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd())

const DENIED_COMMANDS: RegExp[] = [
  /\brm\s+-[a-z]*[rf]/i,
  /\bsudo\b/i,
  /\bgit\s+push\b.*(--force\b|-f\b)/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\b(mkfs|dd)\b/i,
  /\b(shutdown|reboot|halt)\b/i,
  /:\(\)\s*\{.*\};\s*:/,
  /\b(curl|wget)\b[^|]*\|\s*(sh|bash|zsh)\b/i,
  /\bnpm\s+publish\b/i,
  />\s*\/dev\/(sd|disk|rdisk)/i,
]

const PROTECTED_PATHS: RegExp[] = [
  /\/\.ssh\//,
  /\/\.aws\//,
  /\/\.claude(\/|$)/,
  /(^|\/)\.env(\.|$)/,
  /\/\.git\/config$/,
  /id_rsa|id_ed25519/,
]

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

function isDeniedCommand(command: string): boolean {
  return DENIED_COMMANDS.some((pattern) => pattern.test(command))
}

function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some((pattern) => pattern.test(path))
}

function isOutsideProject(path: string): boolean {
  const target = resolve(projectRoot, path)
  return target !== projectRoot && !target.startsWith(projectRoot + sep)
}

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
  if (isOutsideProject(path)) block(`write outside the project root: ${path}`)
}

const { tool_name = '', tool_input = {} } = parseInput(await readStdin())

if (tool_name === 'Bash') checkBash(tool_input)
else if (EDIT_TOOLS.has(tool_name)) checkEdit(tool_input)

process.exit(0)
