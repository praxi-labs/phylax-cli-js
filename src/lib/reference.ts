const ECOSYSTEMS = new Set(['npm', 'pypi', 'golang', 'cargo', 'maven', 'nuget', 'gem'])

export class ReferenceError_ extends Error {}

export function normalise(input: string): string {
  const raw = (input || '').trim()
  if (!raw) throw new ReferenceError_('no artifact given')

  if (raw.startsWith('pkg:')) {
    const body = raw.slice(4)
    const slash = body.indexOf('/')
    if (slash < 1) throw new ReferenceError_(`not a package URL: ${raw}`)
    if (!ECOSYSTEMS.has(body.slice(0, slash).toLowerCase())) {
      throw new ReferenceError_(`unknown ecosystem in ${raw}`)
    }
    return raw
  }

  const slash = raw.indexOf('/')
  if (slash < 1) {
    throw new ReferenceError_(
      `${raw} is missing an ecosystem, try npm/${raw} or pkg:npm/${raw}`,
    )
  }
  const ecosystem = raw.slice(0, slash).toLowerCase()
  if (!ECOSYSTEMS.has(ecosystem)) {
    throw new ReferenceError_(`unknown ecosystem "${ecosystem}" in ${raw}`)
  }
  return `pkg:${ecosystem}/${raw.slice(slash + 1)}`
}
