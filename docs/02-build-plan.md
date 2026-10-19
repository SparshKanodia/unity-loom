# 02 — Build Plan

> The intricate plan. Governs *how* `unity-loom` is built so that it is cohesive, conflict-free, verified, and impossible to bloat. Everything here is machine-enforced by `tools/validate.mjs` in CI.

---

## 1. Information architecture

```
unity-loom/
├─ README.md                     human entry point
├─ AGENTS.md                     agent contract: how to load, route, and obey doctrine
├─ manifest.json                 machine registry: skills, workflows, triggers, budgets, adapters, upstream
├─ LICENSE                       MIT (our text; upstream referenced, never copied)
├─ docs/
│  ├─ 00-repository-synthesis.md
│  ├─ 01-product-idea.md
│  ├─ 02-build-plan.md           ← this file
│  ├─ 03-decision-records.md     ADRs that resolve every upstream conflict
│  ├─ 04-failure-modes.md        issue-derived failure catalogue + mitigations
│  ├─ 05-attribution.md          upstream ledger + license status
│  └─ 06-context-budget.md       budget table and rationale
├─ doctrine/                     the law (single source of truth)
│  ├─ 00-precedence.md           conflict-resolution lattice
│  ├─ 01-safety.md               destructive-action + secrets + approval rules
│  ├─ 02-capabilities.md         T0–T3 tiers, detection, fallbacks
│  ├─ 03-state-freshness.md      mandatory pre-action gate
│  ├─ 04-responses.md            output/context budgets
│  └─ 05-non-invasiveness.md     tooling must not break the project
├─ skills/
│  ├─ unity-loom/SKILL.md        router (mandatory entry)
│  ├─ loom-project/SKILL.md
│  ├─ loom-2d/SKILL.md
│  ├─ loom-3d/SKILL.md
│  ├─ loom-graphics/SKILL.md
│  ├─ loom-ui-audio/SKILL.md
│  ├─ loom-xr/SKILL.md
│  ├─ loom-simulation/SKILL.md
│  ├─ loom-performance/SKILL.md
│  └─ loom-release/SKILL.md
├─ workflows/
│  ├─ foundation.md   2d.md   3d.md   graphics.md   ui-audio.md
│  └─ xr.md   simulation.md   performance.md   release.md
├─ references/
│  ├─ claims.md                  canonical claim registry (claim → source → verified-against)
│  ├─ xr-dialect.md              the ONE XR dialect + compatibility appendix
│  ├─ anti-patterns.md           unified anti-pattern table
│  ├─ adapters.md                adapter health check, retry and read-back contract
│  ├─ examples.md                worked end-to-end examples of every domain
│  ├─ traceability.md            upstream + failure-cluster → design element
│  └─ upstream.md                link ledger
└─ tools/
   ├─ validate.mjs               the validator (no deps)
   ├─ install.mjs                one install path for every harness (no deps)
   └─ README.md
```

**Why this shape.** Doctrine is separated from skills so that a fact is written **once**; skills become *thin routers with a decision tree and a link*. This is the mechanism that makes contradictions structurally impossible rather than merely discouraged.

---

## 2. Canonical skill schema

Every `SKILL.md` frontmatter:

```yaml
---
name: loom-xr
description: "Design, build and verify Unity XR experiences (AR Foundation, XR Interaction Toolkit, OpenXR, hands, comfort). Use when the task touches VR, AR, MR, Quest, visionOS or XR rigs."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
metadata:
  loom: 1
  domain: xr
  tier: 4
  triggers: ["xr", "virtual reality", "augmented reality", "mixed reality", "arfoundation", "xri", "openxr", "quest", "visionos", "hand tracking", "passthrough", "plane detection", "teleport", "comfort", "haptics", "mruk", "polyspatial", "spatial computing", "webxr"]
  budget: { lines: 200, bytes: 8192 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.xr.interaction.toolkit 3.x", "com.unity.xr.arfoundation 6.x"]
  sources: ["docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6", "docs.unity3d.com/Packages/com.unity.xr.arfoundation"]
---
```

**Rules (all lint-enforced):**

| Rule | Rationale | Upstream failure avoided |
|---|---|---|
| `description` is a **single line**, **double-quoted**, **no newlines**, **no unescaped `"`**, ≤ 1024 chars | Prevents YAML breakage and client description limits | Unity `unity-agent-plugin#44`, Besty `#37` |
| Only `name`, `description`, `allowed-tools`, `metadata` at top level | Portability across harnesses | Meta/Unity divergence |
| All custom keys under `metadata` | Spec-safe | — |
| `name` matches directory; unique across the repo | Routing integrity | C8 name collisions |
| `triggers` are lowercase, disjoint across domain skills | One skill per task | Router collisions |
| `verified-against` present and non-empty | Freshness traceability | F8, F12 |
| No `TODO`/placeholder text in shipped files | Quality | — |

---

## 3. Trigger allocation (disjoint by construction)

Router `unity-loom` owns **broad** language and never competes with domains:
`unity`, `my game`, `the project`, `unity editor`, `scene`, `prefab`, `gameobject`, `component`, `build my unity app`, `unity version`, `help with unity`.

Domain skills own **narrow** triggers. No trigger string may appear in two domain skills (validator fails the build otherwise). Bare `ar`/`vr`/`mr` are **banned** as triggers (false positives like "array"/"mr value"); the long forms and product names are used instead.

| Skill | Owns (unique trigger set) |
|---|---|
| loom-project | architecture, asmdef, assembly definition, scriptableobject, save system, dependency injection, service locator, event bus, state machine, fsm, netcode, multiplayer, project setup, folder structure, version control, git, upm package, package manager, scene management, addressables |
| loom-2d | 2d, sprite, sprite atlas, tilemap, rule tile, pixel perfect, light2d, collider2d, rigidbody2d, 2d physics |
| loom-3d | 3d, navmesh, character controller, rigidbody, collider, terrain, probuilder, cinemachine, lod, occlusion culling, animation rigging, timeline, level design |
| loom-graphics | urp, hdrp, render pipeline, shader, shader graph, hlsl, lighting, lightmap, reflection probe, post processing, vfx graph, particle system, batching, gpu instancing, decal, skybox |
| loom-ui-audio | ui toolkit, uxml, uss, ugui, canvas, textmeshpro, tmp, hud, menu ui, audio mixer, sound, sfx, music, spatial audio, localization, input system, rebinding, gamepad, touch controls, accessibility |
| loom-xr | xr, virtual reality, augmented reality, mixed reality, arfoundation, xri, openxr, quest, meta xr, visionos, polyspatial, hand tracking, passthrough, spatial anchor, plane detection, teleport, comfort, haptics, mruk, spatial computing, webxr, hololens, pico, steamvr |
| loom-simulation | simulation, training, procedure, assessment, xapi, scorm, digital twin, instructional design, lms, instructor, cad import, asset transformer |
| loom-performance | performance, profiler, optimize, optimization, memory, gc allocation, fps, draw calls, overdraw, stutter, thermal, bottleneck, frame debugger, renderdoc, memory leak |
| loom-release | build, build profile, ci, cd, gameci, il2cpp, test, unit test, playmode, editmode, ship, release, store submission, crash reporting, security, privacy, obfuscation |

**Routing algorithm (in the router skill and `manifest.json`):**
1. Load `unity-loom`; run the **pre-flight** (doctrine/safety, capabilities, freshness).
2. Score the task against domain triggers (whole-word, case-insensitive).
3. Exactly one match → hand off to that domain skill + its workflow.
4. Multiple matches → apply the **precedence lattice** (§5); if still tied, **ask the user one disambiguating question** (never guess).
5. No match → stay in the router and use the generic workflow.

---

## 4. Single-source-of-truth topology

| Layer | Owns | Skills may |
|---|---|---|
| `doctrine/` | rules that apply everywhere (safety, tiers, freshness, responses, non-invasiveness, precedence) | **link only** |
| `references/claims.md` | technical claims + sources + version | **cite only** (`see claims#C-xx`) |
| `references/xr-dialect.md` | the one XR API dialect + compatibility table | **link only** |
| `workflows/` | the ordered process per domain | **link only** |
| domain `SKILL.md` | decision tree, red lines, handoff to workflow | — |

**No-restatement rule.** If a canonical sentence (outside code fences) appears in two files, the validator flags it unless the line is marked `<!-- summary:ok -->`. This is what prevents "five slightly different versions of the same advice".

---

## 5. Precedence lattice (conflict resolution)

```
L0  doctrine            safety · non-invasiveness · freshness · response budget · precedence
L1  project policy      ADRs in docs/03-decision-records.md (architecture defaults)
L2  domain skill        one of loom-2d/3d/graphics/ui-audio/xr/simulation
L3  cross-cutting       loom-performance (may override L2 with measured evidence)
                        loom-release (may override L2 with test/CI evidence)
L4  tooling/adapters    Unity CLI · unity-mcp · UCP · metavr  (never override L0–L3)
```

**Resolution order:**
1. **Safety/security/privacy** → L0 wins, no exceptions.
2. **An ADR covers the case** → the ADR's default wins; deviation requires the ADR's stated escape-hatch condition.
3. **Measured evidence exists** (Profiler, test, logs, screenshot) → evidence wins over opinion, citing the artifact.
4. **Specificity** → the more specific domain skill wins over a broader one.
5. **Tie** → the router asks the user exactly one question; it never silently picks.

Every L2 conflict found in `docs/00` §5 is assigned an ADR in `docs/03-decision-records.md`. There are no unresolved conflicts by design.

Decisions taken *during* the build are recorded in the same file, in the same format: ADR-0013 (triplicated, drift-checked trigger vocabulary), ADR-0014 (secret scanning is a blocking rule), ADR-0015 (new capability ships as a reference, not a skill), ADR-0016 (the validator tests itself), ADR-0017 (measured evidence beats every default except L0).

---

## 6. Capability tiers & adapters

| Tier | Name | Requires | Used for | Fallback |
|---|---|---|---|---|
| T0 | `file-edit` | nothing | read/write C#, assets, docs on disk | — |
| T1 | `unity-cli` | `unity` CLI | create/open editors, build, test, drive a running editor | T0 + manual build instructions |
| T2 | `live-editor` | Unity MCP / UCP bridge attached to an open Editor | scene/prefab authoring, screenshots, hot-reload, profiling | T1 |
| T3 | `device` | `metavr` / `adb` / Xcode / platform tooling | on-device deploy, logs, perf traces, thermal | T1 + human handoff |

**Adapter rules.**
- Adapters are **detected, never required**; a missing adapter is a *tier downgrade with a defined fallback*, never a hard failure (fixes F4).
- Each editor-touching step: **health check → freshness gate → act → read-back verification** (fixes F1, F2).
- Tool output is **filtered and budgeted** (fixes F5).
- Adapters are described in `doctrine/02-capabilities.md`; no adapter code ships in v1.

---

## 7. Bloat budget (hard limits)

The numeric table lives in [`docs/06-context-budget.md`](06-context-budget.md) and, for the machine, in `manifest.json` → `budgets`. This section states the policy that the numbers serve.

**A budget is a guard against fluff and duplication, not a quota on useful content.**

- If a file exceeds its cap because it contains **substance** — a unique decision, a correct code pattern, a comparison table, a gate, a triage row — the cap is **raised**, in `manifest.json` and in `docs/06` in the same change. The cap moves to fit the content.
- If a file exceeds its cap because of **fluff** — restatement, motivation, un-actionable rules, empty scaffolding — the fluff is removed instead. `docs/06` §4 defines the test.
- What is **never** traded away: one fact in one place, disjoint triggers, no restatement, no orphan files, every claim cited, zero required dependencies, executable-only instructions.

The invariants that do not move: skill count ≤ 12, workflow count ≤ 10, reference count ≤ 8, orphan files 0, duplicated canonical lines 0, external core dependencies 0.

**Growth rule:** a proposed skill must (a) have a non-trivial workflow, (b) have verification, (c) have disjoint triggers, and (d) replace or merge an existing skill. Otherwise it goes into `references/`.

---

## 8. Failure-mode → design traceability

| Failure cluster (from `00` §6) | Design element that fixes it | Where enforced |
|---|---|---|
| F1 transport unreliability | capability tiers + health check + idempotent retry contract | `doctrine/02-capabilities.md` |
| F2 stale editor state | mandatory freshness gate before any editor action | `doctrine/03-state-freshness.md` |
| F3 setup/install sprawl | one spec install path; no per-client hand-written docs | `README.md`, `manifest.json` |
| F4 hard dependencies | zero-requirement core; optional adapters | `doctrine/02-capabilities.md` |
| F5 context bloat | response/context budgets | `doctrine/04-responses.md` |
| F6 frontmatter failure | canonical schema + quoting/length lint | `tools/validate.mjs` |
| F7 non-executable steps | executable-only rule + `HUMAN HANDOFF` block | `doctrine/00-precedence.md` §executability |
| F8 incorrect claims | claim registry + `verified-against` | `references/claims.md` |
| F9 invasive tooling | non-invasiveness doctrine | `doctrine/05-non-invasiveness.md` |
| F10 GUID/asset collisions | no Unity package assets in v1; GUID registry if ever | `docs/01` §7 non-goals |
| F11 cross-platform/CRLF | CRLF-aware validator; 3-OS CI | `tools/validate.mjs`, CI |
| F12 missing references | link-check across skills/workflows/manifest | `tools/validate.mjs` |
| F13 XR interaction lifecycle | interaction lifecycle contract + resume procedure | `loom-xr`, `references/xr-dialect.md` |
| F14 AR session/visual failures | deterministic setup checklist + AR triage table | `workflows/xr.md` |
| F15 verification paradoxes | observable verification only (logs/tests/screenshots) | `doctrine/03-state-freshness.md` |
| F16 secret leakage | blocking secret scan, redacted findings, explicit allowlist marker | `tools/validate.mjs`, `doctrine/01-safety.md` |
| F17 routing drift | trigger vocabulary triplicated and compared byte-for-byte | `tools/validate.mjs`, `skills/unity-loom/SKILL.md` |
| F18 checker rot | validator self-test over synthetic bad inputs, run in CI | `tools/validate.mjs --selftest` |

---

## 9. `tools/validate.mjs` specification

Runs with **Node ≥ 20, zero dependencies**. Exits non-zero on any failure. Checks:

1. **Manifest integrity** — every file on disk is in `manifest.json`; every manifest entry exists.
2. **Frontmatter present & parseable** — minimal YAML parser (handles quoted strings, nested `metadata`).
3. **Frontmatter rules** — single-line quoted description; length ≤ 1024; `name` == directory; required keys; `metadata.verified-against` non-empty; no unknown top-level keys; `allowed-tools` present; `metadata.budget` equal to the manifest budget.
4. **Trigger integrity** — no trigger duplicated across domain skills; router-only triggers not used by domains; banned bare tokens (`ar`,`vr`,`mr`) absent; **no drift** between `manifest.json`, each `SKILL.md` frontmatter and the router's routing table.
5. **Budgets** — per-file lines/bytes and total core bytes, **CRLF-normalized** before measuring.
6. **Links** — every relative markdown link resolves; every `references/...` path exists; every `workflows/x.md` referenced exists.
7. **No-restatement** — normalized canonical lines (outside code fences) unique unless `<!-- summary:ok -->`.
8. **Safety scan** — no secrets (redacted findings; an inline `<!-- loom-allow-secret: reason -->` marker permits a documented placeholder); no `TODO`; no GUI-click instructions (regex on "click the…" inside skills); no vendor dumps (large single-line blocks).
9. **Workflow gates** — every workflow ends with a `## Done when` section; every workflow is owned by a skill; every skill's workflow exists.
10. **Determinism** — validator output is sorted; line endings handled; runs identically on Windows/macOS/Linux.
11. **Self-test** — `--selftest` runs every rule over synthetic bad input and a good input, proving each rule fires and none fires spuriously. The checker is itself a tested artefact (ADR-0016).

## 10. CI matrix

| Job | Runner | Steps |
|---|---|---|
| `validate` | ubuntu, macos, windows × Node 20/22 | `node tools/validate.mjs` |
| `links` | ubuntu | validator link pass (network optional; offline by default) |
| `editor-tests` *(optional, P1)* | ubuntu + GameCI | open fixture project, run EditMode/PlayMode, build manifest check |

CI is **offline-first**: no network needed to validate, so budgets and links can't rot silently into a network flake (fixes F11/F12 underpinning).

## 11. Upstream sync strategy

- `references/upstream.md` + `docs/05-attribution.md` hold the ledger (repo, license, what we took as an *idea*).
- **No copying, no submodules, no generated dumps.**
- Quarterly review cadence documented in `docs/04-failure-modes.md` (watch upstream issues for new failure modes; add a mitigation + a validator rule if it is structural).
- A "new failure mode" requires: evidence (issue link), a mitigation, and a traceability row.

## 12. Acceptance criteria (definition of done)

- [ ] `node tools/validate.mjs` exits 0 on Windows, macOS and Linux.
- [ ] 1 router + 9 domain skills; 9 workflows; 6 doctrine files; references as registered; all in `manifest.json`.
- [ ] 0 trigger collisions; 0 trigger drift between manifest, frontmatter and router table; 0 duplicated canonical lines; 0 broken links.
- [ ] Every file within its budget in `docs/06-context-budget.md`, or the budget raised with a stated reason.
- [ ] Every non-obvious claim has a source and a `verified-against` version.
- [ ] Every conflict in `docs/00` §5 has an ADR in `docs/03`.
- [ ] Every failure cluster F1–F18 maps to a design element (§8).
- [ ] Core skills are useful with **zero** external tools.
- [ ] README teaches a 60-second install and a 5-minute first task.
- [ ] No secret-shaped material in any tracked file; the validator reports findings redacted.
