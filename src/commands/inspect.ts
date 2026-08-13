import { PhylaxSdk } from '@phyi/sdk'

import type { Parsed } from '../lib/args.js'
import { baseUrl, token } from '../lib/config.js'
import { EXIT_ALLOW, EXIT_UNRESOLVED, exitCodeFor, normaliseVerdict } from '../lib/exit.js'
import { emit, fail, line } from '../lib/output.js'
import { normalise, ReferenceError_ } from '../lib/reference.js'

function client(): PhylaxSdk | null {
  const apiToken = token()
  if (!apiToken) {
    fail('no API token, run phylax auth login or set PHYLAX_API_TOKEN')
    return null
  }
  return new PhylaxSdk({ apiToken, baseUrl: baseUrl() })
}

function denied(code: unknown): boolean {
  return code === 'plan_required' || code === 'forbidden'
}

function reference(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    return normalise(raw)
  } catch (error) {
    fail(error instanceof ReferenceError_ ? error.message : String(error))
    return null
  }
}

export async function attestations(args: Parsed): Promise<number> {
  const ref = reference(args.operands[0])
  if (!ref) {
    if (args.operands[0] === undefined) fail('usage: phylax attestations <artifact>')
    return EXIT_UNRESOLVED
  }

  const sdk = client()
  if (!sdk) return EXIT_UNRESOLVED

  const result = await sdk.attestations.list(ref)
  if (!result.success) {
    fail(denied(result.code) ? 'your plan does not include attestations' : `could not read attestations for ${ref}`)
    return EXIT_UNRESOLVED
  }

  const body = result.data as { items?: unknown[] }
  const items = Array.isArray(body.items) ? body.items : []
  const human = items.length
    ? items
        .map((entry) => {
          const row = entry as Record<string, unknown>
          return `${String(row.id ?? '')}  ${String(row.created_at ?? row.issued_at ?? '')}`
        })
        .join('\n')
    : `no attestations for ${ref}`

  emit(body, args.json, human)
  return EXIT_ALLOW
}

export async function search(args: Parsed): Promise<number> {
  const query = args.operands[0]
  if (!query) {
    fail('usage: phylax search <query>')
    return EXIT_UNRESOLVED
  }

  const sdk = client()
  if (!sdk) return EXIT_UNRESOLVED

  const result = await sdk.artifacts.search(query)
  if (!result.success) {
    fail(denied(result.code) ? 'your plan does not include search' : 'search failed')
    return EXIT_UNRESOLVED
  }

  const body = result.data as { items?: unknown[] }
  const items = Array.isArray(body.items) ? body.items : []
  const human = items.length
    ? items
        .map((entry) => {
          const row = entry as Record<string, unknown>
          const verdict = normaliseVerdict(row.verdict)
          return line(verdict, String(row.artifact ?? row.name ?? ''))
        })
        .join('\n')
    : `nothing matched ${query}`

  emit(body, args.json, human)
  return EXIT_ALLOW
}

export async function policy(args: Parsed): Promise<number> {
  if (args.operands[0] !== 'evaluate') {
    fail('usage: phylax policy evaluate <policy> <artifact>')
    return EXIT_UNRESOLVED
  }

  const policyId = args.operands[1]
  const ref = reference(args.operands[2])
  if (!policyId || !ref) {
    if (!policyId) fail('usage: phylax policy evaluate <policy> <artifact>')
    return EXIT_UNRESOLVED
  }

  const sdk = client()
  if (!sdk) return EXIT_UNRESOLVED

  const result = await sdk.policies.evaluate({ policy: policyId, artifact: ref })
  if (!result.success) {
    fail(denied(result.code) ? 'your plan does not include policy evaluation' : 'evaluation failed')
    return EXIT_UNRESOLVED
  }

  const body = result.data as Record<string, unknown>
  const verdict = normaliseVerdict(body.verdict ?? body.decision)
  emit(body, args.json, line(verdict, `${ref} against ${policyId}`))
  return exitCodeFor(verdict, { strict: args.strict, failOn: args.failOn })
}
