import { createInterface } from 'node:readline/promises'

import { PhylaxSdk } from '@phyi/sdk'

import type { Parsed } from '../lib/args.js'
import * as config from '../lib/config.js'
import { EXIT_ALLOW, EXIT_UNRESOLVED } from '../lib/exit.js'
import { emit, fail } from '../lib/output.js'

const KEYS_URL = 'https://app.phyi.dev/marketplace/keys'

async function prompt(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  try {
    return (await rl.question('Paste your Phylax API token: ')).trim()
  } finally {
    rl.close()
  }
}

async function login(args: Parsed): Promise<number> {
  process.stderr.write(`Create a token at ${KEYS_URL}\n`)
  const supplied = args.operands[1]
  const value = supplied ?? (process.stdin.isTTY ? await prompt() : '')

  if (!value) {
    fail('no token given')
    return EXIT_UNRESOLVED
  }

  const sdk = new PhylaxSdk({ apiToken: value, baseUrl: config.baseUrl() })
  const check = await sdk.quota.entitlements()
  if (!check.success) {
    fail('that token was refused')
    return EXIT_UNRESOLVED
  }

  config.write({ token: value })
  process.stderr.write(`Saved to ${config.configPath()}\n`)
  return EXIT_ALLOW
}

function logout(): number {
  config.clear()
  process.stderr.write('Token removed\n')
  return EXIT_ALLOW
}

async function whoami(args: Parsed): Promise<number> {
  const apiToken = config.token()
  if (!apiToken) {
    fail('not signed in')
    return EXIT_UNRESOLVED
  }

  const sdk = new PhylaxSdk({ apiToken, baseUrl: config.baseUrl() })
  const result = await sdk.quota.entitlements()
  if (!result.success) {
    fail('could not read your account')
    return EXIT_UNRESOLVED
  }

  const body = result.data as Record<string, unknown>
  const tier = String(body.tier ?? 'unknown')
  emit(body, args.json, `tier: ${tier}`)
  return EXIT_ALLOW
}

export async function auth(args: Parsed): Promise<number> {
  switch (args.operands[0]) {
    case 'login':
      return login(args)
    case 'logout':
      return logout()
    case 'whoami':
      return whoami(args)
    default:
      fail('usage: phylax auth <login|logout|whoami>')
      return EXIT_UNRESOLVED
  }
}

export async function whoamiTop(args: Parsed): Promise<number> {
  return whoami(args)
}
