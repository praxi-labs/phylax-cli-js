export interface Parsed {
  command: string
  subcommand: string
  operands: string[]
  json: boolean
  strict: boolean
  offline: boolean
  debug: boolean
  help: boolean
  version: boolean
  failOn: string | undefined
}

const BOOLEAN_FLAGS = new Set([
  '--json',
  '--strict',
  '--offline',
  '--debug',
  '--help',
  '-h',
  '--version',
  '-v',
])

export function parse(argv: string[]): Parsed {
  const operands: string[] = []
  const flags = new Set<string>()
  let failOn: string | undefined

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] as string
    if (token === '--fail-on') {
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        failOn = next
        i += 1
      }
      continue
    }
    if (token.startsWith('--fail-on=')) {
      failOn = token.slice('--fail-on='.length)
      continue
    }
    if (BOOLEAN_FLAGS.has(token)) {
      flags.add(token)
      continue
    }
    if (token.startsWith('-')) {
      flags.add(token)
      continue
    }
    operands.push(token)
  }

  return {
    command: operands[0] ?? '',
    subcommand: operands[1] ?? '',
    operands: operands.slice(1),
    json: flags.has('--json'),
    strict: flags.has('--strict'),
    offline: flags.has('--offline'),
    debug: flags.has('--debug'),
    help: flags.has('--help') || flags.has('-h'),
    version: flags.has('--version') || flags.has('-v'),
    failOn,
  }
}
