import { resolve, sep } from 'node:path'

export const DENIED_COMMANDS: RegExp[] = [
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

export const PROTECTED_PATHS: RegExp[] = [
  /\/\.ssh\//,
  /\/\.aws\//,
  /\/\.claude(\/|$)/,
  /(^|\/)\.env(\.|$)/,
  /\/\.git\/config$/,
  /id_rsa|id_ed25519/,
]

export function isDeniedCommand(command: string): boolean {
  return DENIED_COMMANDS.some((pattern) => pattern.test(command))
}

export function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some((pattern) => pattern.test(path))
}

export function isOutsideProject(projectRoot: string, path: string): boolean {
  const root = resolve(projectRoot)
  const target = resolve(root, path)
  return target !== root && !target.startsWith(root + sep)
}
