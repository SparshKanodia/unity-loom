# Traceability

Unity Loom is a synthesis, not a copy. This file is the audit map: every
upstream idea and every issue-derived failure is linked to the file that
answers it, so the design can be checked in both directions.

Sources: `docs/00-repository-synthesis.md` (conflicts 5, failures 6),
`docs/04-failure-modes.md` (F1 to F15), `docs/03-decision-records.md`
(ADR-0001 to ADR-0012), `manifest.json` (upstream array, artifact paths).

`F1` to `F15` are failure clusters, `C1` to `C12` are conflicts, and
`ADR-00nn` are decisions. A name in brackets is a section heading, or a
distinctive fragment of one, in the cited file. Paths are relative to
the repository root. Every row carries a verification column: a file, a
section, or a command.

## How to audit

1. Open each cited file and confirm the named section is still present.
2. For each F-row, confirm the enforcing artifact names that cluster.
3. For each C-row, confirm the ADR id exists in
   `docs/03-decision-records.md` and is reachable from a skill or
   `doctrine/00-precedence.md`.
4. Run `node tools/validate.mjs`; it must exit 0.
5. Confirm every file on disk is in `manifest.json`, and every manifest
   path exists.
6. Re-read `references/upstream.md`; each repository there must appear
   in `docs/05-attribution.md` or in `docs/00-repository-synthesis.md`
   (1).

## A. Upstream to design

Rows 1 to 14 are the `upstream` array of `manifest.json`. Row 15 is
listed in `docs/05-attribution.md` only. Link-only sources in
`references/upstream.md` carry no design element and are not rows here.

| Upstream | Failure / conflict | Design element | Implemented in | Verify |
|---|---|---|---|---|
| `Unity-Technologies/skills` | F6, F12, C9 | editor-driven CLI workflow; linted skill schema | `tools/validate.mjs`; `doctrine/03-state-freshness.md` [the gate] | the validator lints every frontmatter |
| `Unity-Technologies/unity-agent-plugin` | F3, F12 | one install path; one generated catalog | `manifest.json`; `README.md` [60-second install] | the manifest lists every file |
| `Nice-Wolf-Studio/unity-claude-skills` | F7, C10, XR gap | tiered routing; executable-only steps; XR domain | `skills/unity-loom/SKILL.md`; `doctrine/00-precedence.md` [executability] | the GUI scan passes; `skills/loom-xr/SKILL.md` exists |
| `Besty0728/Unity-Skills` | F9, F10, F11 | non-invasiveness; no shipped package; CRLF-safe budgets | `doctrine/05-non-invasiveness.md` [nothing ships by default]; `tools/validate.mjs` | the repo holds no `.meta` or `.asmdef`; CRLF normalized |
| `mflRevan/unity-control-protocol` | F4, F15 | generated catalog; visual proof; omni and surface split | `manifest.json`; `workflows/performance.md` [guard the regression] | the manifest is the only catalog; screenshots prove it |
| `meta-quest/agentic-tools` | F3, F8 | verify-first pre-flight; incremental setup | `skills/unity-loom/SKILL.md` [pre-flight]; `references/claims.md` | pre-flight precedes routing; claims carry a version |
| `CoplayDev/unity-mcp` | F1, F2, F4, F5 | optional adapters; freshness gate; response budget | `doctrine/02-capabilities.md` [tiers]; `doctrine/03-state-freshness.md` [the gate]; `doctrine/04-responses.md` [output budget] | tier table, gate and output cap present |
| `JulianKerignard/Unity-Skills` | C2, C3, C8 | decision trees; unique `loom-*` namespace; tiered tests | `skills/loom-project/SKILL.md` [pick the pattern]; `manifest.json`; `docs/03-decision-records.md` [ADR-0011] | every skill name starts with `loom-` |
| `MuharremTozan/unity-agent-skills` | pattern sprawl | one curated anti-pattern table | `references/anti-patterns.md` | each row cites a governing ADR or claim |
| `alphaonedev/openclaw-graph` | C1 | one XR dialect plus a compatibility appendix | `references/xr-dialect.md` [naming, compatibility appendix] | the dialect lists current names only |
| `marcosotomac/unity-ai` | F2, F15 | observe, act, verify loop | `doctrine/03-state-freshness.md` [the gate, after acting] | the gate comes first, then the read-back |
| `Unity-Technologies/arfoundation-samples` | F14 | AR setup checklist plus a triage table | `workflows/xr.md` [failure triage] | the triage table maps symptom to check |
| `Unity-Technologies/XR-Interaction-Toolkit-Examples` | F13 | interaction lifecycle contract; resume procedure | `references/xr-dialect.md` [interaction lifecycle]; `skills/loom-xr/SKILL.md` [interaction lifecycle] | five transitions and resume steps present |
| `VRMADA/ultimatexr-unity` | F13 SDK churn, hands | SDK compatibility gates; MR track | `skills/loom-xr/SKILL.md` [setup checklist]; `workflows/xr.md` [Track C - MR] | a version check follows every SDK upgrade |
| `jack-arturo/skillissue` | F2, F15 | one graduated build and verify ship path | `workflows/release.md` [verification, build phases] | the ship phases carry gates |

## B. Failure mode to mitigation

| ID | Failure | Mitigation | Enforcing artifact | Observable evidence | Verify |
|---|---|---|---|---|---|
| F1 | transport unreliability | health check, idempotent retry, no assumed session | `doctrine/02-capabilities.md` [detection, probing]; `doctrine/03-state-freshness.md` [the gate] | the tier probe is stated before work | open the cited section |
| F2 | stale editor state | refresh, compile, read, act, read back | `doctrine/03-state-freshness.md` [the gate, after acting] | compile reaches zero errors; read-back matches | open the cited section |
| F3 | setup and install sprawl | one install path; generated manifests; CI link checks | `README.md`; `manifest.json`; `tools/validate.mjs` | the orphan check fails on any unlisted file | `node tools/validate.mjs` |
| F4 | hard dependencies | zero-requirement core; optional adapters; downgrade | `doctrine/02-capabilities.md` [tiers]; `manifest.json` [adapters] | core skills work with a text editor alone | open the cited section |
| F5 | context bloat | filter, paginate, summarize, hard cap | `doctrine/04-responses.md` [output budget, paginate] | a summary is 30 lines; a list is 25 items | open the cited section |
| F6 | frontmatter or YAML failure | single-line quoted description, 1024 characters or fewer | `tools/validate.mjs` [frontmatter rules] | an unquoted or long description fails the run | `node tools/validate.mjs` |
| F7 | non-executable instructions | executable-only rule; `HUMAN HANDOFF` block | `doctrine/00-precedence.md` [executability] | the GUI-phrase scan finds no GUI step | `node tools/validate.mjs` |
| F8 | incorrect or overgeneralized claims | claim registry with a source and a version | `references/claims.md`; `docs/03-decision-records.md` [ADR-0012] | every claim row has a source and a version | open the cited section |
| F9 | tooling breaks the Editor | no auto-running hooks; bounded state; opt-in only | `doctrine/05-non-invasiveness.md` [forbidden by default, bounded state] | the repo ships no hook | open the cited section |
| F10 | asset and GUID collisions | no Unity package assets in v1 | `docs/01-product-idea.md` [non-goals]; `doctrine/05-non-invasiveness.md` [nothing ships by default] | no file with a `.meta` extension exists | list the repository files |
| F11 | cross-platform and CRLF failures | normalize before measuring; three-OS CI | `tools/validate.mjs`; `.github/workflows/ci.yml` | budgets are computed on normalized text | the CI matrix lists three runners |
| F12 | missing or drifting references | link-check every relative link and manifest path | `tools/validate.mjs` | a broken link fails the build | `node tools/validate.mjs` |
| F13 | XR interaction lifecycle bugs | lifecycle contract, resume procedure, SDK gates | `skills/loom-xr/SKILL.md` [interaction lifecycle]; `references/xr-dialect.md` [interaction lifecycle]; `workflows/xr.md` [resume and focus] | destroy-while-selected and resume are explicit | open the cited section |
| F14 | AR session and visual failures | deterministic setup checklist plus triage table | `workflows/xr.md` [session and provider, failure triage] | black screen and jitter rows exist | open the cited section |
| F15 | verification paradoxes | observable evidence only; no hidden hooks | `doctrine/03-state-freshness.md` [observable verification]; `doctrine/05-non-invasiveness.md` [no ambient side effects] | every workflow ends with a `Done when` proof | `node tools/validate.mjs` |
| F16 | secret leakage | blocking secret scan, redacted findings, explicit allowlist marker | `tools/validate.mjs` [secrets rule]; `doctrine/01-safety.md` [secrets] | a credential-shaped string fails the run, printed redacted | `node tools/validate.mjs` |
| F17 | routing drift and trigger collisions | one trigger vocabulary, materialised in three places and compared byte-for-byte | `tools/validate.mjs` [trigger-drift rule]; `skills/unity-loom/SKILL.md` [routing table] | a trigger in one place and not the others fails the run | `node tools/validate.mjs` |
| F18 | the checker rots | the validator runs every rule over synthetic bad and good input in CI | `tools/validate.mjs` [--selftest]; `.github/workflows/ci.yml` | the self-test table is green on every push | `node tools/validate.mjs --selftest` |

Cluster numbering follows `docs/04-failure-modes.md`; the enforcing
artifact and the proof are named here.

## C. Conflict to ADR

| ID | Competing positions | Sides | ADR | Implementing artifact | Verify |
|---|---|---|---|---|---|
| C1 | deprecated XR APIs versus the current model | openclaw-graph vs Besty0728 | ADR-0005 | `references/xr-dialect.md` [naming] | only current names are listed |
| C2 | `unity test` versus the batchmode recipe | Nice Wolf vs Julian and the ecosystem | ADR-0011 | `workflows/release.md` [verification] | the tier chooses the invocation |
| C3 | `Resources` versus Addressables | Julian versus code samples | ADR-0001 | `references/anti-patterns.md`; `skills/loom-project/SKILL.md` [red lines] | the `Resources` rule is named in both |
| C4 | singleton versus dependency injection | Tozan versus Nice Wolf | ADR-0002 | `references/anti-patterns.md`; `skills/loom-project/SKILL.md` [architecture defaults] | the composition default is stated |
| C5 | coroutine versus `Awaitable` versus UniTask | Nice Wolf versus the other packs | ADR-0003 | `skills/loom-project/SKILL.md` [architecture defaults] | the async default names ADR-0003 |
| C6 | smooth locomotion versus teleport and comfort | generic guides versus comfort guidance | ADR-0006 | `skills/loom-xr/SKILL.md` [comfort defaults]; `references/xr-dialect.md` | teleport, snap turn and vignette are default |
| C7 | XRI 2.x versus XRI 3.x dialect | Besty0728 versus Nice Wolf and Unity | ADR-0005 | `references/xr-dialect.md` [compatibility appendix] | one dialect plus one mapping table |
| C8 | identical skill names in several packs | Nice Wolf vs Julian vs openclaw-graph | ADR-0012 | `manifest.json` [skills] | every skill uses the `loom-` namespace |
| C9 | latest tooling versus pinned content | Unity CLI versus plugin drift | ADR-0004 | `references/claims.md`; skill `metadata.verified-against` | each claim records a version |
| C10 | GUI steps versus executable steps | Nice Wolf versus the Unity CLI skills | ADR-0007 | `doctrine/00-precedence.md` [executability] | the GUI-phrase scan passes |
| C11 | reflection versus typed editor APIs | Besty0728 bridge versus other packs | ADR-0009 | `doctrine/00-precedence.md` [common conflicts] | reflection needs a read-back |
| C12 | invasive tooling versus opt-in tooling | Besty0728 and Meta versus the principle | ADR-0010 | `doctrine/05-non-invasiveness.md` [principle] | no auto-running hook exists |

Each conflict is decided once, in `docs/03-decision-records.md`. The
implementing artifact is where the decision is visible at work.

## D. Gaps: what is not enforced automatically

The validator checks structure, size, links, triggers and safety phrases.
It does **not** check meaning. These elements are enforced by doctrine
and review only, and are the weakest links in this map.

| Design element | Gap, and the weakest enforcement |
|---|---|
| F1 retry contract | no rule checks idempotent retry; `doctrine/02-capabilities.md` (prose) |
| F2 freshness gate | no rule observes an agent refreshing an Editor; `doctrine/03-state-freshness.md` (prose) |
| F3 install path | the install command is never executed by CI; `README.md` text only |
| F4 zero-requirement core | no rule forbids a skill naming a required tool; the tier table is prose |
| F5 response budget | tool output is not measured; `doctrine/04-responses.md` only |
| F8 claim coverage | the registry is not checked against skill text; manual audit |
| F10 GUID registry | the registry does not exist yet; `docs/01-product-idea.md` [non-goals] |
| F13 XR correctness | no machine check of XR API names; `references/xr-dialect.md` review |
| F14 AR triage | the triage table is never exercised; `workflows/xr.md` review |
| ADR defaults | ADRs are cited, not enforced; `doctrine/00-precedence.md` [common conflicts] |
| Upstream licences | several rows read "confirm at review"; `references/upstream.md` review |
| Workflow gates | `Done when` must exist, not be met; `tools/validate.mjs` |
| Secret placement | the scan matches credential *shapes*; a secret split across lines or spelled oddly is not caught; `tools/validate.mjs` [secrets] |
| Trigger semantics | drift and collisions are caught; whether a trigger *deserves* to be owned by a skill is a judgement; `manifest.json` review |

## E. Coverage

Table A has 15 rows: the 14 upstreams in the `manifest.json` array plus
one upstream listed only in `docs/05-attribution.md`. Table B has 18 rows,
one per cluster F1 to F18. Table C has 12 rows, one per conflict
in the register of `docs/00-repository-synthesis.md` (5), each decided
in `docs/03-decision-records.md`. Table D has 14 rows, a self-audit of
what the validator does not cover.
