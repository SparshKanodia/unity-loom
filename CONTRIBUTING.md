# Contributing to Unity Loom

Unity Loom is a small, governed repository of Unity agent skills, workflows and
engineering doctrine. It has one goal: a single copy of every fact, a machine
check on every claim, and a size budget that stops it turning into a collection
of near-duplicates.

This guide is written for a stranger. Follow it in order and you will not need
to ask anything.

## What this repository is

| Layer | What it holds |
|---|---|
| `skills/` | One router and nine domain skills: the decision tree for a domain, and the link to its workflow. |
| `workflows/` | Nine gated procedures: the order of the work, the gate each phase clears, and the recovery path. |
| `doctrine/` | The law: precedence, safety, capabilities, freshness, responses, non-invasiveness, collaboration, quality. |
| `references/` | The shared tables: the claim registry, the XR dialect, the anti-pattern list, the adapter contract, worked examples, traceability, the upstream ledger. |
| `docs/` | The design record: synthesis, product idea, build plan, decision records, failure catalogue, attribution, context budget, workflow template. |
| `tools/` | The validator, the installer, and the performance budget checker. No dependencies, no network. |

Read [README.md](README.md) first, then [AGENTS.md](AGENTS.md) for the rules an
agent obeys, and [docs/02-build-plan.md](docs/02-build-plan.md) for the shape of
the whole thing.

## The rules a change must satisfy

1. **One fact, one place.** If a fact already has an owner, link to it. Do not
   restate it, not even in different words. The validator fails the build when
   the same long line appears in two operational files.
2. **Evidence or silence.** Never state a version-specific Unity fact without a
   row in [references/claims.md](references/claims.md) that carries a source
   and a `verified-against` version. If the claim is missing, say so and check.
3. **Executable steps only.** A step is a command, an editor call, a file edit,
   or a `HUMAN HANDOFF` block. Never describe a mouse or a menu.
4. **No secrets, ever.** A credential-shaped string in a tracked file fails the
   validator, and the finding is reported redacted. Read secrets from the
   environment, never from a file.
5. **Stay inside the budget.** A file over its cap grows the cap in
   `manifest.json` and in [docs/06-context-budget.md](docs/06-context-budget.md)
   in the same change, or loses the fluff that pushed it over. The cap moves to
   fit substance; it never pushes substance out.
6. **Everything is listed.** Every `.md` and `.mjs` file is in `manifest.json`.
   An unlisted file is a build failure, not a detail.

## How to add a skill

A new skill is a large decision. It needs **all four** of the following, and
the proposal has to say which existing skill it replaces or merges with.

| Requirement | Why |
|---|---|
| A real workflow | A skill without a procedure is a paragraph, and a paragraph belongs in `references/`. |
| A verification gate | The workflow must end in observable evidence: a log line, a test result, a build, a read-back. |
| Disjoint triggers | Two skills claiming the same phrase make the router unable to choose. |
| It replaces or merges an existing skill | The skill count is capped at 12. Growth happens by substitution. |

If any of the four is missing, the content belongs in `references/`. That is
the intended outcome, not a rejection (ADR-0015).

The steps, in order:

1. Write the workflow first, following
   [docs/07-workflow-template.md](docs/07-workflow-template.md). The template
   is the contract: eight sections, one gate per step, a recovery path.
2. Write the skill: the decision tree, the red lines, the link to the workflow.
   Keep it under 340 lines and 16,000 bytes.
3. Add the entry to `manifest.json` → `skills`, with the tier, the workflow and
   the trigger list.
4. Add the routing row to the router table in `skills/unity-loom/SKILL.md`.
5. Add the triggers to the frontmatter of the new skill. The validator
   compares the manifest, the frontmatter and the router table, and fails on
   any disagreement.
6. Run the validator. It is the only acceptance test.

## How to add a workflow

Follow [docs/07-workflow-template.md](docs/07-workflow-template.md) section by
section. The contract is:

| Section | Contract |
|---|---|
| `When to use` | Three to six request shapes that belong here. |
| `When not to use` | Three to six shapes, each naming the workflow that owns it. |
| `Before you start` | The prerequisites, the operating tier, the fallback for a missing tier. |
| `Steps` | Ordered phases. Every phase carries exactly one `**Gate:**` line. |
| `Limitations` | What the workflow does not cover. |
| `If a step fails` | What to stop, what to revert, what to re-read, when to hand over. |
| `Done when` | A checklist of observable facts, each naming its evidence. |

A workflow is owned by exactly one skill. A workflow that no skill owns is an
orphan and fails the build.

## How to add a claim

1. Add one row to [references/claims.md](references/claims.md) with the claim
   id, the statement, the primary source, and the Unity or package version it
   was verified against.
2. Cite the claim id from the skill or the workflow that relies on it. A claim
   that nothing cites is a claim nobody needs.
3. Say nothing about the fact anywhere else. The registry is the owner.

## How to add an ADR

An ADR records a default that two sources disagreed about, so that the
disagreement is settled once and in writing. Add it to
[docs/03-decision-records.md](docs/03-decision-records.md) in the format the
file already uses:

- **Context.** The disagreement, and the conflict id in
  `docs/00-repository-synthesis.md` if it is one.
- **Default.** The rule that applies when nothing overrides it.
- **Escape hatch.** The one condition under which the default does not apply,
  or an explicit statement that it has none.
- **Why.** The reasoning, short enough to be read in full.
- **Consequences.** What the decision makes harder, what it forbids, and what
  follow-up work it creates.
- **Status.** `Accepted`, `Partially superseded by ADR-00nn`, or
  `Superseded by ADR-00nn`.

Then add the row to the table at the top of that file, and cite the ADR from
the skill or workflow that implements it. The default of an ADR sits at
precedence layer L2, below measured evidence, so a measurement may override
it under ADR-0017 with the artefact named.

## How to add a failure mode

Use the intake template at the end of
[docs/04-failure-modes.md](docs/04-failure-modes.md): an id, the symptoms, the
evidence, the root cause, the mitigation, the enforcing file, and the
validator rule if the failure is mechanically checkable. Add the
corresponding row to [references/traceability.md](references/traceability.md).

## Validate before you open a pull request

```bash
node tools/validate.mjs            # every rule, human-readable
node tools/validate.mjs --json     # the same report, machine-readable
node tools/validate.mjs --selftest # the validator tests itself
```

The validator needs Node 20 or newer, has no dependencies, and never touches
the network. It fails on: a manifest entry with no file, an unlisted file, a
frontmatter that does not parse, a trigger collision, trigger drift between the
manifest, the frontmatter and the router table, a budget overrun, a broken
link, a duplicated canonical line, a GUI-click instruction, an unfinished-work
marker, credential material, and a workflow without a `Done when` gate.

CI runs the same commands on Linux, macOS and Windows against Node 20, 22 and
24, and it runs the installer end to end. The pipeline is in
`.github/workflows/ci.yml`.

## Pull request checklist

- [ ] `node tools/validate.mjs` exits 0, and `--selftest` is green.
- [ ] The budget statement: the size of every file you touched, and the
      budget it sits under. A file over its cap carries a raised cap in
      `manifest.json` and in `docs/06-context-budget.md`, in this change.
- [ ] Every new claim is a row in `references/claims.md` with a source and a
      version, and is cited from the skill or workflow that needs it.
- [ ] The "Done when" evidence: the log line, the test id, the build output or
      the read-back value that proves the change works. Not "it compiles".
- [ ] No secrets: no credential, token, key or connection string in a tracked
      file, a log line, a screenshot or a generated report.
- [ ] One fact, one place: nothing you wrote restates a doctrine, a claim or
      another file.
- [ ] `manifest.json` lists every file you added, and every path it lists
      exists.

## The growth protocol

The repository is capped. A cap is a guard against fluff, not a quota on useful
content.

| Limit | Value | What grows it |
|---|---|---|
| Skills | 12 | A proposal that replaces or merges an existing skill. |
| Workflows | 10 | A proposal that replaces or merges an existing workflow. |
| References | 8 | A capability that needs detail but not a procedure. |
| Total core bytes | 140,000 | Substance. Fluff is deleted instead. |

To grow a file instead of deleting from it, raise the cap in `manifest.json` and
in [docs/06-context-budget.md](docs/06-context-budget.md) in the same change,
and say in the pull request why the content is substance rather than fluff.

## Where to ask

Open an issue with the bug report or the feature request form in
`.github/ISSUE_TEMPLATE`. For a disagreement about a default, open an issue
first and propose the ADR with it, so the decision is discussed before it is
written.
