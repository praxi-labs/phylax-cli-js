import { PhylaxSdk } from '@phyi/sdk'

import type { Parsed } from '../lib/args.js'
import { baseUrl, token } from '../lib/config.js'
import { EXIT_ALLOW, EXIT_UNRESOLVED, exitCodeFor, normaliseVerdict } from '../lib/exit.js'
import { emit, fail, findingSummary, line } from '../lib/output.js'
import { normalise, ReferenceError_ } from '../lib/reference.js'

export async function verify(args: Parsed): Promise<number> {
  const target = args.operands[0]
  if (!target) {
    fail('usage: phylax verify <artifact>')
    return EXIT_UNRESOLVED
  }

  if (args.offline) {
    fail('offline verification needs a local cache, which this build does not carry yet')
    return EXIT_UNRESOLVED
  }

  let reference: string
  try {
    reference = normalise(target)
  } catch (error) {
    fail(error instanceof ReferenceError_ ? error.message : String(error))
    return EXIT_UNRESOLVED
  }

  const apiToken = token()
  if (!apiToken) {
    fail('no API token, run phylax auth login or set PHYLAX_API_TOKEN')
    return EXIT_UNRESOLVED
  }

  const sdk = new PhylaxSdk({ apiToken, baseUrl: baseUrl() })
  const result = await sdk.artifacts.verify(reference)

  if (!result.success) {
    const denied = result.code === 'plan_required' || result.code === 'forbidden'
    fail(
      denied
        ? 'your plan does not include artifact verification'
        : `could not verify ${reference}`,
    )
    if (args.debug) fail(JSON.stringify(result))
    return EXIT_UNRESOLVED
  }

  const body = result.data as Record<string, unknown>
  const verdict = normaliseVerdict(body.verdict)
  const detail = findingSummary(body.finding_counts)

  if (String(body.coverage ?? '') === 'none') {
    emit(body, args.json, line('UNKNOWN', reference, 'not evaluated by the network'))
    if (!args.json) {
      const reason = String(body.reason ?? 'This artifact has not been evaluated by the network.')
      fail(reason)
      fail('a verdict is only meaningful once the network has analysed the artifact')
    }
    return args.allowUncovered ? EXIT_ALLOW : EXIT_UNRESOLVED
  }

  emit(body, args.json, line(verdict, reference, detail))
  return exitCodeFor(verdict, { strict: args.strict, failOn: args.failOn })
}
