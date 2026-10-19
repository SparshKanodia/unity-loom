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
├─ doctrine/      safety · capabilities · state-freshness · precedence · responses · non-invasiveness
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

## 9. Distribution

```bash
npx skills add <org>/unity-loom                       # all skills
npx skills add <org>/unity-loom --skill unity-loom    # router only
gh skill install <org>/unity-loom unity-loom --agent codex --scope user
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

## 11. One-line pitch

> **Unity Loom turns ten overlapping Unity skill repos into one governed system: a router, nine domain skills, nine workflows, a doctrine layer that makes conflicts impossible, and a claim registry that makes unsourced advice unsayable — with zero required dependencies and machine-enforced budgets.**
