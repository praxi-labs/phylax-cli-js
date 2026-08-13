# @phyi/cli

[![status](https://img.shields.io/badge/npm-not_published_yet-lightgrey)](https://github.com/praxi-labs/phylax-cli-js)

Verify a package before you install it, and gate a build on the verdict.

The CLI answers one question at the point where it still matters: is this safe to add?
It runs on your machine before you commit, not after CI rejects the branch, and its exit
code carries the verdict so a pipeline needs nothing else to make a pass or fail decision.

## Install

```sh
npm install -g @phyi/cli
```

Or run it without installing:

```sh
npx @phyi/cli verify npm/express@4.18.2
```

## Authenticate

Verification needs a paid plan. Create a token at
[app.phyi.dev](https://app.phyi.dev/marketplace/keys), then:

```sh
phylax auth login
```

The token is written to `~/.config/phylax/config.json` with owner-only permissions.
`PHYLAX_API_TOKEN` overrides it, which is what CI should use.

## Verify one package

```sh
phylax verify npm/express@4.18.2
phylax verify pkg:pypi/requests@2.32.3
```

Both spellings work. A bare name is refused rather than guessed at, because `express`
exists on more than one registry.

## Verify a whole project

```sh
phylax repo .
```

Reads every lockfile it finds and verifies what they install.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | `ALLOW`, or `WARN` without `--strict` |
| `1` | `BLOCK` |
| `2` | `WARN` under `--strict` |
| `3` | Could not resolve, no token, or the plan does not cover it |

`WARN` passes by default on purpose. New findings land against dependencies you did not
change, so a pipeline that fails on every warning fails on quiet days and gets switched
off. Add `--strict` once your baseline is clean.

## Flags

| Flag | Effect |
| --- | --- |
| `--json` | Machine readable output |
| `--strict` | Treat `WARN` as a failure |
| `--fail-on <verdict>` | Set the verdict that fails the command |
| `--debug` | Verbose diagnostics |

## Layout

```
src/commands/   verify, repo, auth
src/lib/        argument parsing, config, exit codes, references, output
test/unit/      unit tests
```

## The rest of Phylax

| Tool | Where to get it |
| --- | --- |
| JavaScript SDK | [`@phyi/sdk`](https://www.npmjs.com/package/@phyi/sdk) on npm |
| MCP server | [`@phyi/mcp`](https://www.npmjs.com/package/@phyi/mcp) on npm |
| Agent runtime gate | [`@phyi/runtime-gate`](https://www.npmjs.com/package/@phyi/runtime-gate) on npm |
| VS Code extension | [`phylax.phylax`](https://marketplace.visualstudio.com/items?itemName=phylax.phylax) on the Marketplace |
| GitHub Action | [`praxi-labs/phylax-action`](https://github.com/praxi-labs/phylax-action) |

Docs live at [phyi.dev](https://phyi.dev).
