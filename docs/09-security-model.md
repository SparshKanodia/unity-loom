# 09 — Security Model

This document is the threat model for Unity Loom: what is worth protecting,
who might attack it, how they would try, and which control stops each attempt.

It is written to be checkable. Every control below names where it lives, and
§7 records the exact state the repository settings are expected to be in, so
a setting that silently drifts shows up as a diff instead of as an incident.

The short version: Unity Loom is not a service, so there is nothing to
exploit at runtime. The things worth protecting are the **integrity of the
corpus** (an agent reads these files as instructions), the **integrity of the
tooling** (Node scripts that run on CI), and the **absence of secrets** (the
repository is public and the history is permanent).

## 1. What is worth protecting

| Asset | Why it matters | Loss if compromised |
|---|---|---|
| The corpus — `skills/`, `workflows/`, `doctrine/`, `references/` | These files are read as *instructions* by an agent, not as data | An attacker who lands a skill can instruct the reader's agent to run anything the agent can run |
| The tooling — `tools/*.mjs` | Runs on every pull request, on the runner, with the repository token | Code execution in CI, with the repository's read access and whatever else the job can reach |
| The workflows — `.github/workflows/` | Same, and they define which actions are trusted | The same, plus the ability to change which code runs |
| The release — tags, the archive, the attestation | What consumers install | A substituted archive, delivered with a valid-looking provenance claim |
| The history | A secret in the history is a secret forever | Credential compromise that cannot be undone by a later commit |
| The budget and the manifest | They are the validator's inputs | A change that lets a file bypass every check |

## 2. Adversaries

| # | Adversary | Capability | Wants |
|---|---|---|---|
| A1 | Anonymous contributor | Can open a pull request | Code execution in CI, or a malicious instruction shipped to every user |
| A2 | Collaborator with a branch | Can push to a branch, cannot push to `main` | The same, with more reach inside the pipeline |
| A3 | Upstream action author | Controls a GitHub Action the workflow references | Code execution in the release pipeline |
| A4 | Package supply chain | Controls a dependency or a pinned action's next release | The same, by waiting for the pin to move |
| A5 | Token thief | Has a stolen token, a leaked secret or a compromised machine | A push to `main`, a release, or the repository settings |
| A6 | Accidental insider | Makes a mistake | A secret in a commit, a broken release, a hostile instruction in a skill |

## 3. Threats, and the control that stops each

| # | Threat | Attack | Control |
|---|---|---|---|
| T1 | Malicious code lands in `main` | A1 opens a pull request that rewrites `tools/validate.mjs` | `main` accepts pull requests only; one code-owner approval; four required status checks; linear history; the author cannot approve their own change without a second pair of eyes (see the note in §5) |
| T2 | CI is used as a code-execution host | The pull request's own code runs during the pull request | The token is read-only, never persisted in the checkout, and `id-token` is never granted; no secret is reachable from a pull-request run; the only job with write access is the release job, which only runs on a tag |
| T3 | A secret is exfiltrated by a build step | A modified workflow reads a repository secret | Secrets are exposed only in jobs that run trusted code; a pull request cannot reach them; `permissions` are declared per job rather than inherited |
| T4 | A mutable action tag is repointed | A3 pushes a new commit to the `v7` tag | Every action is pinned to a full commit SHA; Dependabot proposes the bump as a pull request, so a pin only ever moves through review |
| T5 | A dependency is compromised | A4 publishes a malicious release of a pinned action | The same: a pinned SHA is a fixed object, and the update path is a reviewed pull request |
| T6 | A secret is committed | A6 pastes a credential into a file | The validator's `secrets` rule fails the build; gitleaks scans the history and the working tree; GitHub's secret scanning and push protection block the push and alert the maintainer |
| T7 | A release is tampered with | A5 pushes or replaces a `v*` tag | Tags are protected by a ruleset that requires a signed tag and forbids force-push; the archive carries a build-provenance attestation naming the commit and the workflow; the release job is the only job with write access |
| T8 | A hostile instruction is shipped | A1 lands a skill that tells the reader's agent to exfiltrate the project | T1's controls apply; the corpus is treated as code, so a change to a skill needs a code owner; the doctrine forbids unsafe steps and the validator rejects GUI-click instructions and credential material |
| T9 | The settings are changed quietly | A5 with a token edits the branch protection or the ruleset | Branch protection is enforced for administrators as well (`enforce_admins`); the settings are recorded in §7, so a drift is visible in a diff of this document; a ruleset change is itself an auditable event in the repository's audit log |
| T10 | The toolchain itself is subverted | A1 edits the validator to make itself pass | The validator has a self-test (`--selftest`) that runs in CI; the validator's rules are documented in `docs/02-build-plan.md` §9; the governance surface has named code owners |

## 4. What is deliberately *not* protected against

- **A hostile maintainer.** The maintainer can edit the branch protection,
  the ruleset and this document. The model protects the repository against
  everyone else.
- **A compromised maintainer machine.** If the machine that holds the signing
  key is compromised, the attacker can sign. The controls that still hold are
  the audit log, the attestation, and the review requirement on pull requests
  from anyone else.
- **A zero-day in Node, Git, or the runner.** Out of scope for a repository
  of documents and small scripts.
- **Denial of service through pull-request spam.** Mitigated by the rulesets
  and the status-check requirement, not eliminated.
- **The content of a third-party service.** A skill that recommends a
  package is a pointer, not a guarantee about that package.

## 5. Accepted risks, and why

| Risk | Why it is accepted | What limits it |
|---|---|---|
| A pull request's code runs on the CI runner | The validator and the installer have to run somewhere, and running them in a pull request is the only way the check means anything | The runner is ephemeral, the token is read-only and not persisted, no secret is reachable, and the job has no network egress beyond the runner image |
| The owner self-approves their own pull request | A single-maintainer repository has exactly one reviewer, so a second reviewer does not exist | The approval requirement still forces a pull request, a green build, a recorded review and an audit trail; the alternative is no changes at all |
| The owner bypasses a signed-commit requirement in one place | Requiring signatures of every external contributor would block most of them | Signatures are required on `main` and on release tags; the owner's own commits are signed with a key registered on the account |
| The corpus is instructions, and instructions are hard to lint | The validator can check structure, not intent | The corpus is reviewed as code, by a code owner, under the same rules as the tooling |

## 6. Verification

The controls are verifiable without trusting this document.

```bash
# The branch protection state, as the API sees it.
gh api repos/SparshKanodia/unity-loom/branches/main/protection

# The rulesets, and who may bypass them.
gh api repos/SparshKanodia/unity-loom/rulesets

# The security features that are switched on.
gh api repos/SparshKanodia/unity-loom --jq .security_and_analysis

# Every action reference is a full commit SHA, not a tag.
rg -n "uses:" .github/workflows/

# The corpus still validates.
node tools/validate.mjs
```

## 7. Expected state of the repository settings

These live in the GitHub API, not in the repository, so they are written down
here. A value that differs from this table is drift.

### 7.1 Branch protection on `main`

| Setting | Value |
|---|---|
| Required status checks | `validate (ubuntu-latest, node 24)`, `install (ubuntu-latest)`, `links`, `secrets` |
| Require branches to be up to date | Yes |
| Require a pull request before merging | Yes |
| Required approving reviews | 1 |
| Dismiss stale reviews on push | Yes |
| Require review from a code owner | Yes |
| Require the last push to be approved | No (see §5) |
| Require conversation resolution | Yes |
| Require signed commits | Yes |
| Enforce for administrators | Yes |
| Require linear history | Yes |
| Allow force pushes | No |
| Allow deletions | No |
| Allow fork syncing | No |

### 7.2 Ruleset on release tags

| Setting | Value |
|---|---|
| Target | Tags matching `refs/tags/v*` |
| Require signed tags | Yes |
| Allow force-push | No |
| Allow deletion | No |

### 7.3 Repository settings

| Setting | Value |
|---|---|
| Secret scanning | Enabled |
| Secret scanning push protection | Enabled |
| Secret scanning validity checks | Not available on this repository's plan; the API refuses to set it. The validator's own secret rule and gitleaks cover the same ground |
| Secret scanning non-provider patterns | Not available on this repository's plan; the API refuses to set it. A custom pattern can be added to `gitleaks.toml` instead |
| Dependabot alerts | Enabled |
| Dependabot security updates | Enabled |
| Code scanning (CodeQL) | Available to public repositories; the workflow in `.github/workflows/codeql.yml` uploads the results |
| Private vulnerability reporting | Enabled |
| Merge commits | Disabled |
| Rebase merges | Enabled |
| Squash merges | Enabled |
| Delete the branch on merge | Enabled |
| Web commit sign-off | Enabled |
| Wiki | Disabled |

### 7.4 Commit signing

The maintainer's commits on `main` and the release tags are signed with an
SSH key registered on the account as a **signing** key. A key that is only
registered for authentication produces a signature GitHub reports as
`unknown_key`, which does not satisfy the "require signed commits" rule, so
the key must be registered in both places.
