import { auth, whoamiTop } from './commands/auth.js'
import { attestations, policy, search } from './commands/inspect.js'
import { repo } from './commands/repo.js'
import { verify } from './commands/verify.js'
import { parse } from './lib/args.js'
import { EXIT_ALLOW, EXIT_UNRESOLVED } from './lib/exit.js'
import { fail } from './lib/output.js'
import { VERSION } from './version.js'

const USAGE = `phylax ${VERSION}

  phylax verify <artifact>     verify one package, for example npm/express@4.18.2
  phylax repo [path]           verify every dependency the lockfiles in path install
  phylax attestations <ref>    list the attestations recorded for an artifact
  phylax search <query>        search the catalogue
  phylax policy evaluate <policy> <ref>
                               evaluate an artifact against a policy
  phylax auth login            store an API token
  phylax auth whoami           show the plan this token is on
  phylax auth logout           forget the stored token

Flags
  --json                       machine readable output
  --strict                     treat WARN as a failure
  --fail-on <verdict>          set the verdict that fails the command
  --allow-uncovered            exit 0 when the network has not analysed the artifact
  --debug                      verbose diagnostics
  --version                    print the version

Exit codes
  0 allowed, 1 blocked, 2 warned under --strict, 3 could not be resolved
`

export async function run(argv: string[]): Promise<number> {
  const args = parse(argv)

  if (args.version) {
    process.stdout.write(`${VERSION}\n`)
    return EXIT_ALLOW
  }

  if (!args.command || args.help) {
    process.stdout.write(USAGE)
    return args.command ? EXIT_ALLOW : EXIT_UNRESOLVED
  }

  switch (args.command) {
    case 'verify':
      return verify(args)
    case 'repo':
      return repo(args)
    case 'attestations':
      return attestations(args)
    case 'search':
      return search(args)
    case 'policy':
      return policy(args)
    case 'auth':
      return auth(args)
    case 'whoami':
      return whoamiTop(args)
    default:
      fail(`unknown command "${args.command}"`)
      process.stdout.write(USAGE)
      return EXIT_UNRESOLVED
  }
}

const invoked = process.argv[1] ?? ''
if (invoked.includes('phylax') || invoked.endsWith('index.js')) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      fail(error instanceof Error ? error.message : String(error))
      process.exitCode = EXIT_UNRESOLVED
    })
}
