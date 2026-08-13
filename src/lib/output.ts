const MARK: Record<string, string> = {
  ALLOW: 'ALLOW',
  WARN: 'WARN ',
  BLOCK: 'BLOCK',
  UNKNOWN: '?    ',
}

export function line(verdict: string, subject: string, detail = ''): string {
  const tag = MARK[verdict] ?? MARK.UNKNOWN
  return detail ? `${tag}  ${subject}  ${detail}` : `${tag}  ${subject}`
}

export function findingSummary(counts: unknown): string {
  if (!counts || typeof counts !== 'object') return ''
  const order = ['critical', 'high', 'medium', 'low']
  const parts = Object.entries(counts as Record<string, unknown>)
    .map(([severity, value]) => [severity, Number(value)] as const)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([severity, value]) => `${value} ${severity}`)
  return parts.join(', ')
}

export function emit(payload: unknown, asJson: boolean, human: string): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
    return
  }
  process.stdout.write(`${human}\n`)
}

export function fail(message: string): void {
  process.stderr.write(`phylax: ${message}\n`)
}
