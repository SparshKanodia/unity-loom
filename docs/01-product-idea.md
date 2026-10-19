# 01 — Product Idea

**Name:** **Unity Loom** — repository slug `unity-loom`
**Tagline:** *One fabric for Unity agent skills, workflows, and engineering doctrine.*
**Kind:** an Agent-Skills-native repository (markdown-first) for Unity 2D, 3D, AR, VR, MR and simulation development.
**Status:** product concept derived from `docs/00-repository-synthesis.md`.

> Naming: "Loom" = many threads (upstream repos) woven into a single cloth (one coherent system). Alternatives considered and rejected: *Atlas* (implies read-only reference), *Forge* (implies code generation, which we deliberately avoid), *Toolbelt* (implies a bag, i.e. bloat). Name appears in exactly one place per surface, so it is trivially re-skinnable.

---

## 1. The problem

Today, a developer who wants AI agents to help with Unity must choose between:

- **fragmented coverage** — Unity's official skills have zero AR/VR/MR; the good XR skills are community packs;
- **conflicting guidance** — the same domain (`unity-xr`, `unity-2d`, `unity-dots`, `unity-multiplayer`, `unity-save`, `unity-test`, `unity-performance`) is covered 3–5 times with *different, sometimes contradictory* advice (see Conflict Register in `00`);
- **fragile tooling** — hard dependencies on Python/uv, `unity-mcp`, `ucp`, or `metavr`; servers that disconnect; editors reported as running when closed; tools that run before the asset database refreshes;
- **silent failure** — skills that never load because of an unquoted YAML colon, or that exceed a client's description limit;
- **context bloat** — 13,000-token tool responses and skills that instruct an agent to *click a GUI button* it cannot click;
- **bloat by aggregation** — the obvious "solution" (copy five repos into one) recreates every conflict and doubles the context cost.

### 1.1 Which problem the product is accountable for

Six problems, one product. They are not equally ours, and saying so is what keeps the product honest about what it can and cannot fix.

| # | Problem | Our standing | Why |
|---|---|---|---|
| 1 | **Conflicting guidance** | **Accountable.** This is the product. | The conflicts are enumerable and decidable: 12 named conflicts, each with a severity, each settled by a recorded default. We own the decision, the reasoning and the record. This is the only one of the six that a repository can genuinely close. |
| 2 | **Bloat by aggregation** | **Accountable.** | The trap is a design failure we can avoid by construction: one fact in one place, a budget, and a validator that fails a duplicate. We do it, and the product is the proof. |
| 3 | **Silent failure** | **Accountable.** | A skill that never loads is a defect with a mechanical cause — an unquoted colon, an over-long description. A linter closes it completely, so there is no excuse. |
| 4 | **Context bloat** | **Accountable.** | The caps and the file budgets are ours, and the validator enforces them. The upstream evidence is one 13,000-token response; the fix is a doctrine and a budget. |
| 5 | **Fragile tooling** | **Secondary.** We reduce it, we do not end it. | Transports, server restarts and stale editor state belong to the Unity CLI, the bridges and the devices. We can make the agent *detect*, *downgrade* and *prove* around them, and we can specify a retry contract — but the bridge still drops. The claim we make is "a dropped connection costs the task a retry, not its correctness". |
| 6 | **Fragmented coverage** | **Secondary.** We fill the gap, we do not own the domain. | Unity's official set has no XR; community packs have good XR and no governance. We add the missing XR and AR/VR/MR surface and give it the governance, but coverage is a moving target and no repository can stay complete on its own. |

The ordering is the argument: the three accountable problems are the ones a repository can actually close, because each is a *record* problem — a fact that must exist once, a decision that must be written down, a rule that must be checked. The two secondary problems are *environment* problems, and the honest claim there is narrower: the agent keeps working, downgrades, and says what proof it gave up.

## 2. The idea

**Unity Loom is not a collection. It is a small, governed system.**

One tiny **router** skill, a handful of **domain skills**, a set of **workflows** (the process), a **doctrine** layer (the law: safety, freshness, precedence, budgets, non-invasiveness), and a **claim registry** (the single source of technical truth). Skills stay short and *point* at doctrine and claims instead of restating them, so guidance cannot contradict itself — because it physically exists in one place.

The repository works **with zero dependencies**. The Unity CLI, Unity MCP, UCP and `metavr` are **optional adapters** detected at runtime; every skill declares what it can do at each capability tier and degrades gracefully.

## 3. Target users & jobs-to-be-done

| User | Job to be done |
|---|---|
| Solo Unity dev using Claude Code / Codex / Cursor | "Give my agent correct Unity expertise without me curating ten repos." |
| Studio tech lead | "Standardize how AI touches our project — no editor-breaking hooks, no GUID collisions, reviewable diffs." |
| XR developer (Quest / Vision Pro / mobile AR) | "One coherent XR surface: XRI + AR Foundation + hands + comfort + MR, in one dialect." |
| Simulation/training team | "Procedures, assessment, multi-user, digital twin, and analytics — treated as first-class, not tips." |
| Skill author / contributor | "A schema and validator that stop me shipping a broken or bloated skill." |

## 4. Design principles (the non-negotiables)

1. **Synthesis, not aggregation.** Every fact exists once. Skills reference doctrine; they do not restate it.
2. **Zero-requirement core.** Markdown skills must be fully useful with no CLI, no MCP, no server, no Python.
3. **Capability tiers, not hard dependencies.** `T0 file-edit` → `T1 unity-cli` → `T2 live-editor (MCP/UCP)` → `T3 device (metavr/adb)`. Each step declares its tier and a fallback.
4. **One canonical dialect.** Pin advice to a primary stack (Unity 6 LTS + URP + XRI 3.x + AR Foundation 6.x) with a single compatibility appendix.
5. **Executable-only.** Never instruct a GUI click. If a step truly needs a human, emit a `HUMAN HANDOFF` block.
6. **Verify, then act, then verify again.** Observe → act → verify, with a mandatory **state-freshness gate** before any editor-touching action.
7. **Non-invasive tooling.** No auto-running editor hooks, no presence detectors, no bounded-history violations, opt-in only.
8. **Budgeted by construction.** Frontmatter length, file size, response size and repo size are enforced by a validator in CI. The budgets bound **fluff and duplication**, not useful content: a file that teaches its domain densely keeps its place, and a cap that no longer fits is raised rather than used to push substance out.
9. **Portable.** Only standard Agent Skills frontmatter (`name`, `description`, `allowed-tools`, `metadata`). Unknown keys namespaced.
10. **Traceable.** Every claim cites a primary source + the version it was verified against; every design element traces to an upstream and a failure cluster.

## 5. What the product actually is (contents)

```
unity-loom/
├─ README.md, AGENTS.md, LICENSE, manifest.json
├─ docs/          understanding, product idea, build plan, ADRs, failure modes, attribution
├─ doctrine/      precedence · safety · capabilities · state-freshness · responses ·
│                 non-invasiveness · collaboration · quality
├─ skills/        unity-loom (router) + loom-project, loom-2d, loom-3d, loom-graphics,
│                 loom-ui-audio, loom-xr, loom-simulation, loom-performance, loom-release
├─ workflows/     foundation, 2d, 3d, graphics, ui-audio, xr, simulation, performance, release
├─ references/    claims registry, XR dialect & compatibility, anti-patterns, adapter guide,
│                 worked examples, traceability, upstream ledger
└─ tools/         validate.mjs (frontmatter · triggers · links · budgets · secrets · self-test)
                  install.mjs (one install path for every harness)
```

**The router is mandatory.** A single `unity-loom` skill owns broad triggers ("unity", "my game", "the project"). Domain skills own *narrow, disjoint* triggers and never self-activate on shared words. A machine-checked routing table resolves any task to exactly one domain skill, and a precedence lattice resolves any cross-domain disagreement.

## 6. What makes it different

| Typical pack | Unity Loom |
|---|---|
| Copies content per skill | One fact, one place; skills point at doctrine/claims |
| Overlapping skills self-activate | Router owns discovery; triggers are disjoint and lint-enforced |
| Contradictions discovered by the user | Conflicts pre-resolved in ADRs with an explicit default + escape hatch |
| Requires a server/CLI | Works with none; adapters optional |
| GUI instructions | Executable-only + HUMAN HANDOFF |
| Unbounded, silent, invasive | Budgeted, link-checked, non-invasive, CI-validated |
| No feedback loop | Failure-mode catalog derived from 200+ upstream issues, each mapped to a design rule |

## 7. Non-goals (the anti-bloat charter)

- **No vendored upstream content.** No copying, no forks, no generated dumps.
- **No Unity package / no `.meta` / no asmdef in v1.** Nothing can collide with the user's project.
- **No server, daemon, GUI, or database.**
- **No framework code.** This repository does not ship Unity C# as a dependency; code appears only as short, self-contained examples inside skills.
- **No coverage-for-coverage's sake.** A topic earns a skill only if it has (a) a real workflow, (b) verification, and (c) distinct triggers.
- **No more than ~12 skills and ~10 workflows.** Growth requires removing something first.

## 8. Success metrics

### 8.1 Hygiene metrics

These are properties of the repository itself, and the validator or a review checks each one.

| Metric | Target |
|---|---|
| Core useful with zero external tools | 100% of skills runnable at T0/T1 |
| Frontmatter parse + load success | 100% (CI) |
| Trigger collisions | 0 (CI) |
| Trigger drift across manifest, frontmatter and router table | 0 (CI) |
| Duplicated doctrine statements | 0 (linter counts repeated canonical lines) |
| Broken internal links | 0 (CI) |
| Fluff in shipped files | 0 (reviewed against the test in `docs/06-context-budget.md` §4) |
| Total core context footprint (all router + domain SKILL.md) | within the budget in `docs/06-context-budget.md` |
| Version-specific assertions in skills and workflows that carry a citation | 100% (reviewed) |
| Registry rows cited by at least one artefact | ≥ 80% (a claim may be registered before it is needed) |
| Registry rows whose source was fetched and read | 100% |
| Secrets in tracked files | 0 (CI, redacted findings) |
| Windows/macOS/Linux validator parity | 100% |

### 8.2 Product metrics

These are properties of the work the agent does, and they are counted from real task transcripts rather than from the repository.

| Metric | Target | How it is counted |
|---|---|---|
| Tasks completed end to end without a second attempt | ≥ 80% | A task counts as complete when its "Done when" gate is met on the first run; a retry after a failure or a clarification request is a second attempt |
| Time from install to first useful change | ≤ 15 minutes | Install to the first committed change in a real project, measured by a user-reported timestamp pair |
| Tasks where the agent produced a read-back proof | 100% of editor-touching tasks | A named log line, test id, screenshot or build in the answer, counted against the workflow gates |
| Contexts where the agent refused to guess because a claim was missing | tracked, and each one becomes a registry row | A refusal is a good outcome; the count is a measure of the registry's gaps, and it should fall as the registry grows |

The fourth metric is deliberately not zero and not a target to minimise. An agent that never refuses is an agent that is guessing, and the count of refusals is the honest measure of what the claim registry does not yet cover.

## 9. Distribution

```bash
npx skills add SparshKanodia/unity-loom                       # all skills
npx skills add SparshKanodia/unity-loom --skill unity-loom    # router only
gh skill install SparshKanodia/unity-loom unity-loom --agent codex --scope user
```

From a clone, the built-in installer does the same for any harness, reading the catalogue from `manifest.json`:

```bash
node tools/install.mjs plan    --target agents     # show what will be installed, and where
node tools/install.mjs install --target agents     # copy the skills
node tools/install.mjs verify  --target agents     # prove the installed copy matches the repo
```

Claude Code / Codex / Grok plugin manifests are generated from `manifest.json` (never hand-maintained), so they cannot drift.

## 10. Roadmap

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **P0** | Docs + doctrine + router + 9 domain skills + 9 workflows + validator + CI | Validator green; budgets met; conflicts resolved in ADRs |
| **P1 (shipped)** | Compatibility appendix, worked examples for every domain, secret scanning, trigger-drift detection, validator self-test, one-command installer | Validator green; self-test 18/18; every route has a worked example |
| **P2 (in progress)** | Adapter guide (Unity CLI / editor bridge / device tooling) with a health-check, retry and read-back contract per adapter | Each adapter has a health check and an idempotent retry contract |
| **P3** | Community: issue templates, skill-proposal RFC, quarterly version-review cadence | External contributions follow the same validator |
| **P4 (only if justified)** | A single optional Unity helper package (namespaced, GUID-registry, opt-in) | Non-invasiveness + collision CI proven |
| **P5 (planned)** | The generation layer: MCP providers for voice, 3D, image and sound, behind one skill and one workflow | One request produces a finished, imported, verified asset. The plan is in [docs/08-mcp-integration-plan.md](08-mcp-integration-plan.md) and the phases in [ROADMAP.md](../ROADMAP.md) |

## 11. Why not the alternatives

Five other things a Unity team can do instead. Each is cheaper to start and worse to live with, and the reason is the same in every row: the alternatives solve the *install* problem and leave the *conflict* problem untouched.

| Alternative | What it costs | Where it breaks | Why the product is the better answer |
|---|---|---|---|
| **Copy the official Unity skills** | Zero setup cost; a maintained, authoritative source | No AR/VR/MR coverage at all, and the same content in three channels that drift apart; frontmatter is not linted, so a malformed description silently stops a skill loading | The official set is the baseline we start from, and we take its editor-driven workflow and its skill granularity. We add the XR surface it lacks, one dialect instead of three, and a linter that makes silent loading impossible. |
| **Install five community skill packs at once** | Five installs, five routing vocabularies, five sets of `unity-*` names; every prompt is answered by whichever pack matches first | Identical skill names mean different content, so a request lands in the wrong pack; duplicated trigger words make two skills claim one request; the context cost of the union is roughly the sum of the parts | One namespace, one router, disjoint triggers, and a machine check that no two skills claim the same word. The community packs' best ideas (tiering, anti-hallucination guardrails, observe-act-verify) are re-derived here, once each, with a decision record behind them. |
| **Just prompt a larger model** | No repository to maintain, no review, no version | The model has no source, so a version-specific API assertion is a guess; it has no record of what this project decided, so it re-litigates the same conflict every session; it has no budget, so the tool output is whatever the tool returned | A larger model is a better guess. This product is what turns a guess into a cited claim with a version, a settled default, and a bounded answer. The model is the reader of this repository, not a substitute for it. |
| **Vendor a fork of one upstream repository** | The fastest apparent win: take a working pack and patch it | The fork inherits every conflict the pack had, plus the ones it now has with the other four packs; it ages alone, so the moment it is forked it is behind the upstream it came from; the licence may forbid redistribution | The synthesis takes the ideas and re-derives the wording, so nothing is copied and no licence obligation is inherited. A fork is one upstream's answers to the ecosystem's problems; this is the ecosystem's answers. |
| **Build the skills in house** | Full control, and the team learns the domain deeply | Every one of the 12 conflicts has to be settled by the team, by hand, and re-settled every time an upstream moves; nothing enforces the decision, so it lives in a chat message and is lost; there is no validator, so a skill that does not load is found by the user | The team still owns the decisions; the difference is that the decisions are written down, cited and checked. The repository is the cheapest way to get what a home-grown set produces, minus the parts that are pure overhead for one team. |

The pattern across all five: an alternative can make the *first* task work. The product is about the hundredth task, when a conflict resurfaces, an upstream moves, and the answer has to be the same as last time.

## 12. Kill criteria

The product should be abandoned, or folded into the official skills, when one of these holds. Each is measurable, and each names the evidence that proves it.

| # | Condition | Why it is a kill condition |
|---|---|---|
| K1 | The upstream official skills cover the XR and performance domains with the same governance — a claim registry with versions, a precedence rule, a freshness gate and a validator — and they are maintained on the same cadence | The product's only accountable advantage over the official set is governance. If the official set has it, this repository is a worse copy of it |
| K2 | Fewer than five distinct Unity agent repositories disagree on a material decision, and the disagreements that remain are cosmetic | The conflict register is the product. Without conflicts to settle there is no synthesis to make, and the repository becomes a second official set |
| K3 | Fewer than 20 registry rows are cited by a shipped artefact for two consecutive quarterly reviews | A registry nobody cites is a maintenance cost with no return, and the cost is the reason to stop |
| K4 | The validator is bypassed or fails in CI more than one release in a row, and the failures are not fixed within a quarter | A green build that does not mean anything is worse than no build. If the safety net cannot be kept, the claims cannot be trusted either |
| K5 | Adoption shows that fewer than 10% of tasks end with a read-back proof, and the failures are in the skills rather than in the tools | The product sells proof. If the proof does not arrive, the skills are advice, and advice is what the upstream already provides |
| K6 | Two consecutive quarterly reviews find no upstream change worth recording | The upstream landscape has stopped moving, so the synthesis has stopped adding value, and the maintenance effort has no return |
| K7 | A maintained upstream covers every domain in the overlap map with a comparable or better dialect, a claim registry and a working validator | This is the general form of K1: the product has been superseded by the thing it was built to improve on |

The default action on any kill condition is **merge, not abandon**. The registry, the decision records and the validator are useful to the official skills as components, so the repository's exit is a contribution rather than a deletion.

## 13. Maintenance and support

| Question | Answer |
|---|---|
| Who maintains the claim registry | A named maintainer per domain, from the people who wrote the domain skill. A row is added by the person who read the primary source, and a row is only changed by its owner or by the maintainer of that domain |
| Who maintains the decision records | The repository maintainer, because a decision record is a conflict between domains rather than a fact inside one. A change to a record needs a second reader, not a second opinion on taste |
| Review cadence | A quarterly upstream and licence review in the first month after each quarter. It covers: new upstream repositories and issues, Unity release notes, package version changes, licence changes, and the death of any upstream the ledger credits |
| When a Unity release lands | Within one week: the `verified-against` field of every affected claim is checked against the new editor version, the affected rows are re-read or marked stale, and the skill frontmatter that names the version is updated. A stale row is marked stale, not silently kept |
| When an upstream repository changes | At the next quarterly review, or immediately if the change is in a domain we depend on. The upstream ledger row is updated with what changed, what was taken and what was rejected |
| Support | Issues on this repository are triaged as: a broken skill, a wrong claim, a missing decision, a request. A request is answered with the reason it was declined, and the reason is recorded where the request would have applied |
| What "keeping the registry honest" costs | Roughly one day per quarter for the review itself, plus about half a day per Unity release for the re-verification, plus the ongoing cost of reading a primary source for every new row. The cost is real and it is the reason the review cadence is quarterly and not continuous |
| What is deliberately not maintained | The upstream code itself. Nothing is vendored, so there is nothing to merge forward; only the ideas and the citations are tracked |

## 14. Limitations

The product's honest limits, stated so that nobody buys more than it delivers.

- **The claim registry is verified against a specific Unity version.** The rows are verified against Unity 6000.3. A project on a different Unity version must re-verify what it uses; the registry does not transfer automatically, and a claim that is true on 6000.3 may be wrong on 2022 LTS or on the next release.
- **The product does not run Unity.** It never launches the editor, never opens a project and never builds. Everything it says about a running project comes from an adapter, a tool the user runs, or the user's own report. Where no adapter is present, the answer is a set of instructions, and the proof is the user's.
- **The product does not author art.** It does not model, texture, animate, light or compose. It can tell an agent which tool and which settings to use, and it can check the result against a budget; it cannot make the result good.
- **The product does not replace a human decision on design.** Whether a game should be a first-person or a third-person game, whether a mechanic is fun, and whether a scene reads clearly are not engineering questions. The repository decides how the work is done, never what the work should be.
- **The zero-requirement core has a floor.** At T0 the agent can read, write and reason about a project, and it can produce a change and a build recipe, but it cannot observe the editor's state, run a test on a device, or capture a screenshot. Some tasks are honestly out of reach at T0 and the product says so rather than pretending.
- **The guidance is only as fresh as the last review.** A quarter is the cadence, so a claim can be wrong for up to three months after the world changes. A user who finds one should say so, and the fix is a pull request.
- **The synthesis is narrower than the union of its sources.** It is a router, nine domain skills, nine workflows, a doctrine layer, a claim registry and a validator. Everything the upstream packs contain that does not fit that shape is deliberately not here, and the domain knowledge in the packs that this repository does not cover is a real loss for a user who needs it.
- **The product does not verify the user's project.** It cannot tell that a scene is well composed, that a frame budget is met on the user's hardware, or that the build is correct. It can tell the agent how to find out, and it can require that the finding be recorded.

## 15. One-line pitch

> **Unity Loom turns ten overlapping Unity skill repos into one governed system: a router, nine domain skills, nine workflows, a doctrine layer that makes conflicts impossible, and a claim registry that makes unsourced advice unsayable — with zero required dependencies and machine-enforced budgets.**
