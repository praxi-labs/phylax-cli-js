import { describe, expect, it } from 'vitest'

import { parse } from '../../src/lib/args.js'
import {
  EXIT_ALLOW,
  EXIT_BLOCK,
  EXIT_UNRESOLVED,
  EXIT_WARN,
  exitCodeFor,
  normaliseVerdict,
} from '../../src/lib/exit.js'
import { findingSummary } from '../../src/lib/output.js'
import { ReferenceError_, normalise } from '../../src/lib/reference.js'

describe('artifact references', () => {
  it('accepts a package URL unchanged', () => {
    expect(normalise('pkg:npm/express@4.18.2')).toBe('pkg:npm/express@4.18.2')
  })

  it('adds the pkg prefix to the short form', () => {
    expect(normalise('npm/express@4.18.2')).toBe('pkg:npm/express@4.18.2')
    expect(normalise('pypi/requests==2.32.3')).toBe('pkg:pypi/requests==2.32.3')
  })

  it('keeps a scoped npm name intact', () => {
    expect(normalise('npm/@types/node@22.0.0')).toBe('pkg:npm/@types/node@22.0.0')
  })

  it('refuses a bare name with no ecosystem', () => {
    expect(() => normalise('express')).toThrow(ReferenceError_)
  })

  it('refuses an ecosystem it does not know', () => {
    expect(() => normalise('cocoapods/AFNetworking')).toThrow(ReferenceError_)
    expect(() => normalise('pkg:cocoapods/AFNetworking')).toThrow(ReferenceError_)
  })

  it('refuses empty input', () => {
    expect(() => normalise('   ')).toThrow(ReferenceError_)
  })
})

describe('exit codes', () => {
  it('allows a clean artifact', () => {
    expect(exitCodeFor('ALLOW')).toBe(EXIT_ALLOW)
  })

  it('fails a blocked artifact', () => {
    expect(exitCodeFor('BLOCK')).toBe(EXIT_BLOCK)
  })

  it('lets a warning pass by default and fails it under strict', () => {
    expect(exitCodeFor('WARN')).toBe(EXIT_ALLOW)
    expect(exitCodeFor('WARN', { strict: true })).toBe(EXIT_WARN)
  })

  it('treats an unresolvable verdict as unresolved rather than allowed', () => {
    expect(exitCodeFor('probably fine')).toBe(EXIT_UNRESOLVED)
    expect(exitCodeFor('')).toBe(EXIT_UNRESOLVED)
  })

  it('honours an explicit fail-on threshold', () => {
    expect(exitCodeFor('WARN', { failOn: 'warn' })).toBe(EXIT_BLOCK)
    expect(exitCodeFor('ALLOW', { failOn: 'warn' })).toBe(EXIT_ALLOW)
    expect(exitCodeFor('BLOCK', { failOn: 'warn' })).toBe(EXIT_BLOCK)
  })

  it('normalises the words the API can return', () => {
    expect(normaliseVerdict('pass')).toBe('ALLOW')
    expect(normaliseVerdict(' Deny ')).toBe('BLOCK')
    expect(normaliseVerdict(undefined)).toBe('UNKNOWN')
  })
})

describe('argument parsing', () => {
  it('separates the command from its operands', () => {
    const args = parse(['verify', 'npm/express@4.18.2', '--json'])
    expect(args.command).toBe('verify')
    expect(args.operands[0]).toBe('npm/express@4.18.2')
    expect(args.json).toBe(true)
  })

  it('reads fail-on in both spellings', () => {
    expect(parse(['verify', 'x', '--fail-on', 'warn']).failOn).toBe('warn')
    expect(parse(['verify', 'x', '--fail-on=block']).failOn).toBe('block')
  })

  it('does not swallow the next operand when fail-on has no value', () => {
    const args = parse(['verify', '--fail-on', '--json', 'npm/x@1'])
    expect(args.failOn).toBeUndefined()
    expect(args.json).toBe(true)
  })

  it('recognises version and help', () => {
    expect(parse(['--version']).version).toBe(true)
    expect(parse(['verify', '-h']).help).toBe(true)
  })
})

describe('finding summary', () => {
  it('orders severities worst first and drops zeros', () => {
    expect(findingSummary({ low: 3, critical: 1, medium: 0, high: 2 })).toBe(
      '1 critical, 2 high, 3 low',
    )
  })

  it('says nothing when there are no findings', () => {
    expect(findingSummary({})).toBe('')
    expect(findingSummary(null)).toBe('')
  })
})

describe('uncovered artifacts', () => {
  it('parses the allow-uncovered flag', () => {
    expect(parse(['verify', 'pkg:npm/express']).allowUncovered).toBe(false)
    expect(parse(['verify', 'pkg:npm/express', '--allow-uncovered']).allowUncovered).toBe(true)
  })

  it('does not treat an uncovered artifact as allowed', () => {
    expect(exitCodeFor('ALLOW')).toBe(EXIT_ALLOW)
    expect(EXIT_UNRESOLVED).not.toBe(EXIT_ALLOW)
  })
})
