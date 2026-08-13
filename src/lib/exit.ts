export const EXIT_ALLOW = 0
export const EXIT_BLOCK = 1
export const EXIT_WARN = 2
export const EXIT_UNRESOLVED = 3

const ORDER = ['ALLOW', 'WARN', 'BLOCK']

export function normaliseVerdict(raw: unknown): string {
  if (typeof raw !== 'string') return 'UNKNOWN'
  const word = raw.trim().toUpperCase()
  switch (word) {
    case 'ALLOW':
    case 'PASS':
    case 'OK':
      return 'ALLOW'
    case 'WARN':
    case 'WARNING':
    case 'REVIEW':
      return 'WARN'
    case 'BLOCK':
    case 'DENY':
    case 'FAIL':
      return 'BLOCK'
    default:
      return 'UNKNOWN'
  }
}

export interface ExitOptions {
  strict?: boolean
  failOn?: string | undefined
}

export function exitCodeFor(verdict: string, options: ExitOptions = {}): number {
  const known = normaliseVerdict(verdict)
  if (known === 'UNKNOWN') return EXIT_UNRESOLVED

  const failOn = options.failOn ? normaliseVerdict(options.failOn) : null
  if (failOn && failOn !== 'UNKNOWN') {
    return ORDER.indexOf(known) >= ORDER.indexOf(failOn) ? EXIT_BLOCK : EXIT_ALLOW
  }

  if (known === 'BLOCK') return EXIT_BLOCK
  if (known === 'WARN') return options.strict ? EXIT_WARN : EXIT_ALLOW
  return EXIT_ALLOW
}
