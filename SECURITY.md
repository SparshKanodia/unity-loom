# Security Policy

Unity Loom is a public, CC0-licensed repository of agent skills, workflows and
documentation, plus a small amount of Node tooling that validates the
repository. It has no runtime dependencies, no server, no user data store and
no account system. The realistic threat is therefore not a breach of a running
service: it is **malicious or unsafe content reaching `main`**, and a secret
leaking into the history.

This document says what is protected, how to report a problem, and what
counts as a reportable vulnerability.

## Supported versions

Only the latest released version is supported. Fixes land on `main` and ship
in the next tag; there is no long-term-support branch.

| Version | Supported |
|---|---|
| `main` | Yes, as the development line |
| Latest tag (`v*`) | Yes |
| Any earlier tag | No — upgrade to the latest tag |

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private vulnerability reporting, which is enabled on this
repository:

- **Security** → **Report a vulnerability** in the repository's
  `Security` tab, or
- the private advisory form at
  `https://github.com/SparshKanodia/unity-loom/security/advisories/new`

If private reporting is unavailable to you, open a public issue that says
only "security report, please open a private channel" — no technical detail —
and the maintainer will reply with a private route.

Please include, if you can:

- what an attacker can achieve (read a secret, run code, corrupt a release),
- the exact file and line, or the commit,
- how to reproduce it,
- what a correct behaviour would be.

### What to expect

| Stage | Target |
|---|---|
| Acknowledgement | 3 days |
| Triage and severity | 7 days |
| Fix or mitigation for a confirmed issue | 30 days, sooner if an exploit is public |
| Disclosure | After the fix is released, unless a user is at risk sooner |

The maintainer will credit the reporter in the advisory unless anonymity is
requested.

## What is in scope

- Anything in `tools/` — the validator, the installer, the budget checker.
- Anything in `.github/workflows/` — the CI and code-scanning pipelines, and
  the permissions, pins and triggers they carry.
- The content of `skills/`, `workflows/`, `doctrine/` and `references/` where
  following it would cause a machine to run unsafe instructions, exfiltrate
  data, or take a destructive action without confirmation.
- `manifest.json` and the budget rules, where a change would let a file
  bypass the validator.
- The release pipeline, the published tags, and the release archive.

## What is out of scope

- Vulnerabilities in Unity, in a package a skill recommends, or in a third
  service a skill talks to. Report those to the vendor.
- Vulnerabilities in the GitHub Actions an external repository uses. Report
  those upstream; a pin bump in this repository is the mitigation.
- Findings that need a maintainer to run a command on a machine that already
  trusts the repository.
- Missing hardening in a fork you maintain yourself.
- Automated scans, without a demonstrated impact on this repository.

## How this repository defends itself

The full threat model, with each attack mapped to the control that stops it,
is in [docs/09-security-model.md](docs/09-security-model.md). The controls in
force are:

| Control | Where it lives |
|---|---|
| `main` is protected by a ruleset: pull request only, one code-owner approval, required status checks, no force-push, no branch deletion, linear history | GitHub repository settings |
| Only the maintainer can bypass the ruleset | GitHub repository settings |
| Release tags must be signed | GitHub repository settings |
| Every CI action is pinned to a full commit SHA | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| No secret is reachable from a pull-request run | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| The token is read-only everywhere except the release job, and the checkout does not persist it | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| Secret scanning and push protection are on | GitHub repository settings |
| Dependabot watches the pinned actions | [.github/dependabot.yml](.github/dependabot.yml) |
| CodeQL analyses the JavaScript tooling and the workflow files | [.github/workflows/codeql.yml](.github/workflows/codeql.yml) |
| The release archive carries a build-provenance attestation | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| The validator fails the build on credential-shaped material in a tracked file | [tools/validate.mjs](tools/validate.mjs) |
| gitleaks scans the whole history and the working tree | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| Changes to the governance surface need a named code owner | [.github/CODEOWNERS](.github/CODEOWNERS) |
| Contributors sign off on their commits (DCO) | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Security-relevant properties of the code

- The core corpus is Markdown. It is read by an agent, and the instructions
  in it are the product; a hostile instruction in a skill is a code-injection
  vector into the reader's session. A change to a skill is therefore reviewed
  by a code owner like any other code change.
- `tools/*.mjs` use only the Node standard library. There is no lockfile to
  poison and no `postinstall` hook to hijack, because there are no
  dependencies to install.
- The repository holds no credential. The MCP integrations planned for the
  future read every key from the environment of the calling process, never
  from a file in the repository, and the validator's `secrets` rule fails the
  build if that ever changes.
- The `install` path copies files. It is exercised end to end on every pull
  request on two operating systems, and the `verify` subcommand proves the
  installed copy matches the repository.

## If you are the maintainer

The security settings are not in the repository, because they live in the
GitHub API. The state that is expected is written down in
[docs/09-security-model.md](docs/09-security-model.md) §7, so a setting that
drifts is visible in a diff.
