# Unity Loom

**One fabric for Unity agent skills, workflows, and engineering doctrine.**

Unity Loom is a governed, markdown-only set of Agent Skills for Unity: one router
skill, nine domain skills, nine gated workflows, and the doctrine that settles
every disagreement between them. It needs no Unity CLI, no editor bridge and no
device, and it enforces its own size, link, trigger and secret budgets in CI.

Install it with one command, and read [Install](#install) for the harness
table:

```bash
node tools/install.mjs install --target claude   # or codex, cursor, opencode, all
```

## The problem

A Unity developer who wants an agent to help with a project cannot get a
correct answer by picking the best repository. There is no best repository,
because the same domains are covered by three to five separate community skill
packs and they disagree. The evidence is in
[docs/00-repository-synthesis.md](docs/00-repository-synthesis.md) and
[docs/01-product-idea.md](docs/01-product-idea.md).

- **The advice conflicts.** Resources versus Addressables, singleton versus
  dependency injection, coroutine versus `Awaitable` versus UniTask, a
  load-at-`Start` habit versus explicit load-and-release, and deprecated XR type
  names that one pack still shows in examples and another lists as a
  hallucination to avoid. The synthesis names **12 conflicts** and rates each
  one; two are critical. Ten skill names mean different things in different
  packs, so an agent that reads two packs has gained a coin flip, not knowledge.
  ([conflict register](docs/00-repository-synthesis.md))
- **Setup and install sprawl.** The tooling ranges from a CLI to an MCP bridge
  to a UCP bridge to device tooling, and the "all or nothing" setups break: one
  upstream describes itself as very all-or-nothing to set up, and the
  documented install command is wrong on one client and right on the next. The
  synthesis groups the failures into **18 clusters**, 15 mined from upstream
  issue trackers and 3 more this repository has to survive on its own, derived
  from **200+ upstream issues**. ([failure taxonomy](docs/00-repository-synthesis.md),
  [failure catalogue](docs/04-failure-modes.md), [six problems](docs/01-product-idea.md))
- **Skills fail to load silently.** One upstream pack lost 4 of its 29 skills
  to an unquoted YAML colon in a `description` field. A skill can also die on a
  wrong filename casing, a missing required field, a description over the
  client's limit, or a reserved directory name. There is no error message; the
  skill simply never appears.
- **Context bloat.** One tool response in the wild was about 13,300 tokens. A
  pack that answers a task by shipping forty files pays that cost on every
  request.
- **The obvious fix makes it worse.** Copying five repositories into one
  recreates every conflict above in a single namespace, doubles the context
  cost of every request, and re-creates the exact failure the ecosystem
  already has: two skills claiming the same trigger. Each individual
  repository is good. The problem is the set.

Every one of those conflicts is now settled in writing, in
[docs/03-decision-records.md](docs/03-decision-records.md): 24 decision records,
each with a default, an escape hatch and the reason.

## What this repository is

| Part | What it holds |
|---|---|
| Router | One skill, `unity-loom`, that owns discovery and the pre-flight. |
| Domain skills | Nine: project, 2D, 3D, graphics, UI/audio, XR, simulation, performance, release. |
| Workflows | Nine gated processes, one per domain, each ending in a `Done when` gate. |
| Doctrine | Eight files: precedence, safety, capabilities, state freshness, responses, non-invasiveness, collaboration, quality. |
| Claim registry | 171 rows, ids `C-001` to `C-216`, each with a source and the Unity version it was verified against. |
| Validator | `tools/validate.mjs`: frontmatter, trigger drift, links, budgets, duplication, secrets, and a self-test. |
| Installer | `tools/install.mjs`: one install path for every harness, zero dependencies. |
| Harness matrix | `HARNESSES.md`: every target id, path, activation step and gotcha. |

## What it is not

- Not a collection of vendored code. No upstream text, code or asset is copied.
- Not a Unity framework. It ships no C# dependency, no `.meta` and no asmdef.
- Not a replacement for the editor. It tells the agent what to run and what to
  read back.
- Not a second source of truth beside the official Unity skills. It is a
  synthesis with its own decisions, and it says so in the decision records.
- Not a place where upstream prose is pasted. Every upstream is credited by
  name, licence and the one idea taken from it.

## How it is governed

Six mechanisms, each machine-checked.

| Mechanism | What it does | Where it lives |
|---|---|---|
| One fact, one place | Doctrine and the references own the truth; skills link to it and never restate it. The validator fails the build when the same canonical line appears in two operational files. | [docs/06-context-budget.md](docs/06-context-budget.md) |
| The router owns discovery | The trigger vocabulary is written once and materialised in three places — the manifest, each skill's frontmatter and the router's routing table — and the validator compares them byte for byte. Domain triggers are disjoint, so no skill can hijack another. | ADR-0013, [skills/unity-loom/SKILL.md](skills/unity-loom/SKILL.md) |
| A precedence lattice and 24 decision records | Doctrine, then measured evidence, then the ADR default, then the domain skill, then upstream convention, then personal preference. A lower layer never overrides a higher one, and a measurement outranks any default when the artefact is named. | [doctrine/00-precedence.md](doctrine/00-precedence.md), [docs/03-decision-records.md](docs/03-decision-records.md) |
| Hard budgets, enforced in CI | Per-file line and byte caps, a cap of 12 skills and 10 workflows that can only grow by replacing something, a cap of 8 references, a 140,000-byte core, and zero orphan files. | [docs/06-context-budget.md](docs/06-context-budget.md) |
| A zero-requirement core | A missing Unity CLI, editor bridge or device is a downgrade with a named fallback, never an error. Tiers run from T0 file-edit to T3 device, and the agent states the tier it is working at. | [doctrine/02-capabilities.md](doctrine/02-capabilities.md), [references/adapters.md](references/adapters.md) |
| Credential material is a build failure | The scan covers every tracked file, and a finding is reported redacted. | ADR-0014 |

## Install

Node 20 or later. The installer has zero dependencies, makes no network call,
and writes nothing outside the target directory it names. From a clone:

```bash
git clone https://github.com/<org>/unity-loom.git
cd unity-loom
node tools/install.mjs plan    --target claude   # show what will be installed, and where
node tools/install.mjs install --target claude   # write the 10 skills and the shared corpus
node tools/install.mjs verify  --target claude   # prove the installed copy matches the repository
```

Substitute your organisation for `<org>`. `plan` lists the destination, the
skills and the shared file count. `install` writes it. `verify` compares the
installed copy with the repository and exits non-zero when anything is stale.

### Harness table

| Harness | `--target` | Command | Lands in | Activate |
|---|---|---|---|---|
| Claude Code | `claude` | `install --target claude` | `~/.claude/skills` | `/reload-skills` in the session |
| OpenAI Codex CLI | `codex` | `install --target codex` | `~/.agents/skills` | `[features] skills = true` in `~/.codex/config.toml` |
| Google Antigravity | `antigravity` | `install --target antigravity` | `~/.gemini/config/skills` | restart the editor |
| Grok Build | `grok` | `install --target grok` | `~/.grok/skills` | restart the session |
| Cursor | `cursor` | `install --target cursor` | `~/.cursor/skills` | reopen the project |
| opencode | `opencode` | `install --target opencode` | `~/.config/opencode/skills` | restart opencode |
| OpenRouter | `openrouter` | `install --target openrouter` | `~/.agents/skills` | point your own loader at the directory |
| Hermes | `hermes` | `install --target hermes` | `~/.hermes/skills` | add `~/.agents/skills` to `skills.external_dirs` |
| Z.AI ZCode | `zai` | `install --target zai` | `~/.zcode/skills` | restart ZCode |
| Kimi Code | `kimi` | `install --target kimi` | `~/.config/agents/skills` | restart Kimi |

Every command in the table is `node tools/install.mjs` followed by the shown
arguments. `node tools/install.mjs install --target all` installs into every
harness already present on the machine, and creates no directory for a harness
that is not installed. [HARNESSES.md](HARNESSES.md) carries the full matrix
for every target id, the per-harness gotchas, the Agent Skills specification
rules and the troubleshooting table.

### Project-local, single-skill and published installs

```bash
node tools/install.mjs install --target project              # .agents/skills in the working directory
node tools/install.mjs install --target claude --scope project
node tools/install.mjs install --target claude --skill unity-loom   # the router alone

npx skills add <org>/unity-loom                      # every skill
npx skills add <org>/unity-loom --skill unity-loom   # router only
gh skill install <org>/unity-loom unity-loom --agent codex --scope user
```

Use a project-local install when the skills belong to one repository and should
be committed with it, or when a harness on the machine only reads the project
directory. Use a user-level install when you want the skills in every project.

Two warnings about the GitHub CLI installer. `gh skill install --agent codex`
writes to `~/.codex/skills`, which Codex no longer reads; the supported user
path is `~/.agents/skills`. And the ecosystem installers copy one skill
directory at a time, so they never create the `loom-shared` directory and the
links inside the copied skill point at files that are not there. Use
`tools/install.mjs` when the links have to work.

Two harnesses need something else. **Aider** has no skills support and no
automatic `AGENTS.md` discovery: add `read: AGENTS.md` to `.aider.conf.yml`, and
point Aider at the shared corpus with `read: .agents/skills/loom-shared/AGENTS.md`
after a project-local install. **OpenRouter** is a library, not a harness, and
ships no skills loader: point your own loader at the installed directory. Their
reference implementation reads `~/.claude/skills`, so install with `--target
claude` as well if you follow that example.

### Verify it worked, and uninstall

```bash
node tools/install.mjs doctor --target claude
```

A good result prints the destination, `skills: 10/10 SKILL.md present`, the
shared corpus as `loom-shared/ present` with every file counted, and the
activation note, then ends with `The installation looks usable.` and exits 0. A
missing file is reported and the exit code is 1.

The installer creates one directory per skill plus one shared directory inside
the destination it names. Remove those eleven directories to uninstall:
`unity-loom`, `loom-project`, `loom-2d`, `loom-3d`, `loom-graphics`,
`loom-ui-audio`, `loom-xr`, `loom-simulation`, `loom-performance`,
`loom-release` and `loom-shared`. Remove the destination itself only if the
installer created it and nothing else is in it.

### The install layout

`D/<skill-name>/SKILL.md` for each of the ten skills, plus `D/loom-shared/`
holding the workflows, doctrine, references, docs, the skills tree and the
root documents. A skill body links to shared files with a repo-relative
`../../` prefix, which is two levels above `skills/<name>/`; after an install
the skill sits one level below the skills root, so the installer rewrites
`../../` to `../loom-shared/` in the installed copies. Inside `loom-shared` the
original links are already correct and are left untouched.

## Use it

The five-minute path: the `unity-loom` router loads on any Unity request, the
pre-flight runs (safety, capability tier, state freshness, output budget,
non-invasiveness), the request routes to exactly one domain skill and that
skill's workflow, every step clears one gate that names its evidence, and the
workflow ends with `Done when`, a checklist of observable facts.

Type one of these and watch it route:

- "Set up a pixel-perfect 2D project with rule tiles"
- "Add a NavMesh character with a Cinemachine camera"
- "Controller input dies after the Quest system menu"
- "The build runs at 40 fps on device"

[references/examples.md](references/examples.md) holds eleven worked examples
end to end, each with the request, the tier, the route, the plan, the
verification and the mistakes to avoid.

## How it fits your harness

| Depth | What you do | What it buys | What it costs |
|---|---|---|---|
| 1 | Install the skills and ask in plain language. | Routing, gates and cited claims in every answer. | Nothing to maintain; the project is not governed. |
| 2 | Install into the project and add `AGENTS.md` to the project root. | The agent reads the contract before it reads the code. | One file in the repository, and it must be kept current. |
| 3 | Install the skills, copy `GUIDE.md` and `AGENTS.md` into the project, and run `node tools/validate.mjs` in CI. | The installed corpus, the project rules and the budgets are checked on every push. | A checkout to validate and a CI job to keep green. |

## The four questions

| Question | Answer | Where it is settled |
|---|---|---|
| Which Unity version are the claims verified against, and what if my project differs? | Unity 6000.3. A project on another version must re-verify the claim it relies on and record the result. | [references/claims.md](references/claims.md), ADR-0012 |
| How is the tier chosen? | Probe read-only from T3 down to T0, at most twice per tier, and work at the highest tier whose probe passed and whose target the task names. | [doctrine/02-capabilities.md](doctrine/02-capabilities.md) |
| How is a deviation from a recorded default recorded? | As a deviation record naming the ADR, the escape-hatch condition, the evidence and the expiry. | [doctrine/00-precedence.md](doctrine/00-precedence.md) |
| What does "Done when" mean? | A checklist of observable facts, each naming its evidence: a log line, a test id, a screenshot, a build or a read-back value. | [docs/07-workflow-template.md](docs/07-workflow-template.md) |

[GUIDE.md](GUIDE.md) is the agent-facing version of these questions, with the
owning file for each answer. [AGENTS.md](AGENTS.md) is the contract the agent
obeys.

## Repository map

| Path | What it holds |
|---|---|
| [skills/](skills/unity-loom/SKILL.md) | The router and nine domain skills, each with a decision tree and a link to its workflow. |
| [workflows/](workflows/foundation.md) | Nine gated procedures, one per domain, each with a `Done when` gate. |
| [doctrine/](doctrine/00-precedence.md) | The law: precedence, safety, capabilities, freshness, responses, non-invasiveness, collaboration, quality. |
| [references/claims.md](references/claims.md) | The claim registry: 171 rows, each with a source and a verified-against version. |
| [references/](references/examples.md) | The XR dialect, the anti-pattern list, the adapter contract, the worked examples, the traceability map, the upstream ledger. |
| [docs/00-repository-synthesis.md](docs/00-repository-synthesis.md) | The evidence: the repositories read, the conflicts, the failure clusters. |
| [docs/03-decision-records.md](docs/03-decision-records.md) | The 24 decision records that settle the conflicts. |
| [docs/05-attribution.md](docs/05-attribution.md) | Every upstream, its licence, the idea taken and the part rejected. |
| [tools/validate.mjs](tools/validate.mjs) | The validator, its self-test, the installer and the performance budget. |
| [HARNESSES.md](HARNESSES.md) | The install matrix for every harness, with gotchas and troubleshooting. |
| [AGENTS.md](AGENTS.md) | The contract the agent obeys, and [GUIDE.md](GUIDE.md) the path through it. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | The rules a change must satisfy, and the growth protocol. |

## Validation and CI

```bash
node tools/validate.mjs            # every rule, human-readable
node tools/validate.mjs --json     # the same report, machine-readable
node tools/validate.mjs --selftest # the validator tests itself
```

The validator fails on a manifest entry with no file, an unlisted file, a
frontmatter that does not parse, a trigger collision, trigger drift between the
manifest, the frontmatter and the router table, a budget overrun, a broken
link, a duplicated canonical line, a GUI-click instruction, unfinished-work
markers, credential material, and a workflow without a `Done when` gate.

CI runs the self-test and the validator on Linux, macOS and Windows against
Node 20, 22 and 24, and it runs the installer end to end. The pipeline is
[.github/workflows/ci.yml](.github/workflows/ci.yml).

## Contributing

A new skill needs four things: a real workflow, a verification gate, triggers
disjoint from every other skill, and a statement of which existing skill it
replaces or merges. Content that does not need a procedure belongs in
`references/`. The rules and the growth protocol are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licence and attribution

MIT — see [LICENSE](LICENSE). Upstream projects are referenced and credited,
never copied: each is listed with its licence, the single idea taken from it
and the part rejected, in [docs/05-attribution.md](docs/05-attribution.md) and
[references/upstream.md](references/upstream.md).

## Limitations

- The claim registry is verified against Unity 6000.3. A project on another
  version must re-verify the claims it relies on.
- This repository does not run Unity, and it does not author art, audio or
  shaders for a project.
- It does not replace a human design decision. It routes, checks and proves.
- Editor-only steps — reading the frame debugger, watching the Profiler
  window — need a human, and the repository says so in a `HUMAN HANDOFF`
  block instead of pretending otherwise.
- Harness paths change between harness versions, so
  [HARNESSES.md](HARNESSES.md) records the current paths and is the file to
  re-read before an install, not the table above.
