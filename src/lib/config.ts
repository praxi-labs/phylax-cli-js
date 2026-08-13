import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { dirname, join } from 'node:path'

export const DEFAULT_BASE_URL = 'https://api.phyi.dev'

export interface Stored {
  token?: string
  baseUrl?: string
}

export function configPath(): string {
  const override = process.env.PHYLAX_CONFIG_PATH
  if (override) return override

  if (platform() === 'win32') {
    const base = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    return join(base, 'phylax', 'config.json')
  }
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(base, 'phylax', 'config.json')
}

export function read(): Stored {
  const path = configPath()
  if (!existsSync(path)) return {}
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    return parsed && typeof parsed === 'object' ? (parsed as Stored) : {}
  } catch {
    return {}
  }
}

export function write(patch: Stored): void {
  const path = configPath()
  mkdirSync(dirname(path), { recursive: true })
  const merged = { ...read(), ...patch }
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, { mode: 0o600 })
  try {
    chmodSync(path, 0o600)
  } catch {
    /* windows has no posix mode */
  }
}

export function clear(): void {
  const path = configPath()
  if (existsSync(path)) rmSync(path)
}

export function token(): string {
  return process.env.PHYLAX_API_TOKEN?.trim() || read().token?.trim() || ''
}

export function baseUrl(): string {
  return (
    process.env.PHYLAX_BASE_URL?.trim() || read().baseUrl?.trim() || DEFAULT_BASE_URL
  )
}
