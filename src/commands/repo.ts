import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { PhylaxSdk } from '@phyi/sdk'

import type { Parsed } from '../lib/args.js'
import { baseUrl, token } from '../lib/config.js'
import { EXIT_UNRESOLVED, exitCodeFor, normaliseVerdict } from '../lib/exit.js'
import { emit, fail, line } from '../lib/output.js'

const MANIFESTS = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'requirements.txt',
])

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', 'venv'])
const MAX_FILES = 40
const MAX_BYTES = 2_000_000

export function collect(root: string): Record<string, string> {
  const found: Record<string, string> = {}

  const walk = (dir: string, depth: number): void => {
    if (depth > 4 || Object.keys(found).length >= MAX_FILES) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      if (SKIP.has(name)) continue
      const full = join(dir, name)
      let info
      try {
        info = statSync(full)
      } catch {
        continue
      }
      if (info.isDirectory()) {
        walk(full, depth + 1)
        continue
      }
      if (!MANIFESTS.has(name) && !name.startsWith('requirements')) continue
      if (info.size > MAX_BYTES) continue
      try {
        found[relative(root, full).split('\\').join('/')] = readFileSync(full, 'utf8')
      } catch {
        continue
      }
    }
  }

  walk(root, 0)
  return found
}

export async function repo(args: Parsed): Promise<number> {
  const target = args.operands[0] ?? '.'
  if (!existsSync(target)) {
    fail(`${target} does not exist`)
    return EXIT_UNRESOLVED
  }

  const files = collect(target)
  if (Object.keys(files).length === 0) {
    fail('no lockfiles found, so there is nothing to verify')
    return EXIT_UNRESOLVED
  }

  const apiToken = token()
  if (!apiToken) {
    fail('no API token, run phylax auth login or set PHYLAX_API_TOKEN')
    return EXIT_UNRESOLVED
  }

  const sdk = new PhylaxSdk({ apiToken, baseUrl: baseUrl() })
  const result = await sdk.repositories.verify({ files })

  if (!result.success) {
    const denied = result.code === 'plan_required' || result.code === 'forbidden'
    fail(
      denied
        ? 'your plan does not include repository scanning'
        : 'could not scan this repository',
    )
    return EXIT_UNRESOLVED
  }

  const body = result.data as Record<string, unknown>
  const verdict = normaliseVerdict(body.verdict)
  const scanned = Number(body.dependencies_scanned ?? 0)

  emit(body, args.json, line(verdict, target, `${scanned} dependencies`))
  return exitCodeFor(verdict, { strict: args.strict, failOn: args.failOn })
}
