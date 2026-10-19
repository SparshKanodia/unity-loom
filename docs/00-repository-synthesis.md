# 00 — Repository Synthesis

**Purpose:** a single, evidence-based understanding of every Unity skill / workflow / best-practice repository reviewed, so that the new product is a *synthesis* and not a *copy*.

- **Compiled:** October 2026
- **Method:** repo metadata + file-tree inspection (GitHub API), README/SKILL.md reading, and **issue-tracker mining** (search API + issue pages) across the source repositories.
- **Rule followed throughout:** we **do not vendor** upstream content. We record what exists, what it is good at, where it breaks, and what we will re-derive. All upstreams are referenced by URL + license.

---

## 1. Sources reviewed

### 1.1 Skill / agent repositories (primary)

| # | Repository | ★ | License | Scale | Format | Hard dependency |
|---|---|---|---|---|---|---|
| A | `Unity-Technologies/skills` | 1.1k | Unity Companion License | ~30–38 skills | `skills/<kebab-name>/SKILL.md` + references | Unity CLI (for many skills) |
| B | `Unity-Technologies/unity-agent-plugin` | 489 | Unity Companion License | same set, packaged | Claude/Codex/Grok plugin manifests | Unity CLI |
| C | `Nice-Wolf-Studio/unity-claude-skills` | 40 | MIT | **35 skills**, ~95 files | `skills/unity-*/SKILL.md` + `references/` | Unity CLI (+ Playwright-style `unity-ops` testbed) |
| D | `Besty0728/Unity-Skills` | 1.9k | MIT | **~85 modules**, Python bridge | UPM package + `unity-skills~/skills/<mod>/SKILL.md` + `API_REFERENCE.md` | **UPM package + Python** (`unity_skills.py`) |
| E | `mflRevan/unity-control-protocol` (UCP) | 30 | MIT | 9 skills (omni + 8 surface) | Rust CLI `ucp` + C# bridge; skills generated from `skills/*/SKILL.md`; `skills/index.json` catalog | **`ucp` CLI + bridge package** |
| F | `meta-quest/agentic-tools` | 221 | Apache-2.0 | **30+ skills** | `skills/hz-*/SKILL.md` + plugin manifests for 6 agents; README table is generated | **`metavr` CLI + device** |
| G | `CoplayDev/unity-mcp` | 15.1k | MIT | 50+ MCP tools (not skills) | Python MCP server + Unity package | Python/uv + MCP client |
| H | `JulianKerignard/Unity-Skills` | 8 | MIT | 18 skills | `skills/unity-*/SKILL.md` + references | none |
| I | `MuharremTozan/unity-agent-skills` | 17 | (check) | ~24 skills | per-pattern skill dirs | none |
| J | `alphaonedev/openclaw-graph` | 5 | (check) | 312 skills, incl. `ar-vr/unity-xr` | graph-native (Neo4j), not flat files | Neo4j workspace |
| K | `jack-arturo/skillissue` | — | (check) | includes `unity-quest-build` | flat skills | Unity CLI, adb |
| L | `marcosotomac/unity-ai` | — | (check) | control-plane (not skills) | MCP + Editor plugin | Unity Editor |
| M | `skillsdirectory.com` → Claude Dev Suite `unity-xr` | — | free | 1 skill (4.2 KB) | single SKILL.md | none |

### 1.2 Knowledge / awesome-list repositories (secondary — link sources only)
`baba-s/awesome-unity-open-source-on-github` (4.5k★, Unlicense), `michidk/Unity-Script-Collection` (6.4k★, GPL-3.0 repo), `insthync/awesome-unity3d` (2.7k★, Unlicense), `StefanoCecere/awesome-opensource-unity` (2.3k★, CC0), `UnityCommunity/AwesomeUnityCommunity` (659★, CC0), `netpyoung/awesome-unity-free` (206★, MIT), `jeffreylanters/awesome-unity-packages` (53★).

### 1.3 Official sample / reference repositories (evidence for claims)
`Unity-Technologies/arfoundation-samples` (3.4k★), `Unity-Technologies/XR-Interaction-Toolkit-Examples` (1.3k★), `Unity-Technologies/EntityComponentSystemSamples` (8.2k★), `Unity-Technologies/ml-agents` (19.8k★), `Unity-Technologies/Graphics` (3.0k★), `Unity-Technologies/InputSystem`, `Unity-Technologies/UnityCsReference` (13k★), `Unity-Technologies/NavMeshComponents`, `Unity-Technologies/com.unity.multiplayer.samples.coop`, `Unity-Technologies/Unity-Robotics-Hub`, `VRMADA/ultimatexr-unity` (563★, MIT), `ExtendRealityLtd/VRTK` (3.7k★, MIT, legacy), `microsoft/MixedRealityToolkit-Unity` (6.1k★, MIT, legacy).

---

## 2. Per-repository dossier

### A/B. Unity official skills + plugin — *the baseline, and a cautionary tale*
**What it is.** The canonical, Unity-maintained skill set (`new-unity-project`, `unity-package-management`, `unity-cli`, `unity-pipeline`, `build-gtk`, 2D skills, `physics-3d-collision`, URP/Shader Graph skills, `ui`/`ui-ugui`/`ui-uitk`/`ui-imgui`, audio, localization, IAP, LevelPlay, AI navigation, multiplayer, `optimize-*`, `project-auditor-fixes`, `asset-transformer-toolkit`).

**Strengths.** Authoritative; grounded in Unity's own tooling; drives the *live editor* through the Unity CLI instead of hand-editing scene YAML (the correct approach); shipped through one plugin so it updates atomically; no AR/VR skill (a real gap).

**Weaknesses observed.**
- No XR/AR/VR/MR coverage at all → the single biggest functional gap in the ecosystem.
- Same content exists in **three channels** (`skills` repo, plugin, CLI docs) that **drift out of sync** (issue `unity-agent-plugin#61`).
- Frontmatter is not linted: `unity-agent-plugin#44` — *unquoted `description:` containing `": "` broke YAML so 4 of 29 skills never loaded.* This is a silent, total failure of a skill.
- No issues enabled on the `skills` repo → low feedback signal.

**Lesson adopted.** Lint frontmatter mechanically; single generation source; never rely on a human to spot a skill that silently fails to load.

### C. Nice-Wolf-Studio — *best free XR + best architectural tiering*
**What it is.** 35 skills over Unity 6.3 LTS, explicitly tiered: **Tier 1 correctness** (`unity-3d-math`, `unity-physics-queries`, `unity-lifecycle`, `unity-input-correctness`, `unity-async-patterns`), **Tier 2 architecture** (`unity-game-architecture`, `unity-state-machines`, `unity-data-driven`, `unity-save-system`, `unity-scene-assets`), **Tier 3 design-intent** (`unity-game-loop`, `unity-npc-behavior`, `unity-ui-patterns`, `unity-level-design`, `unity-procedural-gen`), plus domain skills including **`unity-xr`** (XRI, OpenXR, AR Foundation, hands, haptics, Quest/Vision Pro).

**Strengths.** Best free XR skill; the *tiering* idea (correctness → architecture → design intent) is the strongest structural idea in the ecosystem; every skill ships anti-patterns and API quick-reference; progressive disclosure via `references/`.

**Weaknesses observed (from issues).**
- **GUI instructions an agent cannot execute** (`#8` "Use the Sprite Editor"; `#7` bake modeled as a human `[MenuItem]` click).
- **Overgeneralized claims** (`#6` "Rigidbody required" is wrong for kinematic trigger pairs).
- **Tooling/harness brittleness**: an entire `unity-ops` testbed generates issues about permission hooks, byte-budget scripts that only index `~/.claude/skills/unity-cli` (`#33`), a closed Editor reported as `isRunning: true` (`#30`), self-contradicting pre-flight (`#29`), and hook classification bugs (`#14`–`#19`, `#34`–`#43`).
- `unity-*` names **collide** with JulianKerignard's identical names (see §5).

**Lesson adopted.** Tiered routing; anti-patterns per topic; *executable-only instructions* (never a GUI click); validate claims against primary sources; keep "verification tooling" out of the skill runtime.

### D. Besty0728 — *the largest community collection; the loudest failure modes*
**What it is.** ~85 modules via a UPM package + Python reflection bridge; module list includes `xr`, `optimization`, `profiler`, `performance`, `navmesh`, `terrain`, `shader`/`shadergraph`, `animator`, `timeline`, `addressables`, `netcode`, `ui`/`uitoolkit`, `asmdef`, `architecture`, `patterns`, `scriptdesign`, `testability`, `validation`, `workflow`, `probuilder`, `cinemachine`, `dotween`, `qframework`, `yooasset`, `hybridclr`, `unity-cli`, `skill-creator`, and hallucination-guardrail sections.

**Strengths.** Explicit **anti-hallucination guardrails**: "correct class names to anchor on", "DO NOT (common hallucinations)", a collider-configuration matrix, a hard rule to read `API_REFERENCE.md` before reflection-based property edits; three-tier operating modes (Approval / Auto / Bypass) with a grant protocol.

**Weaknesses observed (from issues).**
- **Editor-breaking tooling**: `#58` a `DOTweenPresenceDetector` caused an *infinite recompile loop*; `#49` unbounded history growth degraded `asset_create_folder` from 0.5 s → 6.7 s.
- **Collision with other packages**: `#41` a `package.json.meta` **GUID collides with `unity-mcp`**, producing missing-script warnings.
- **Frontmatter limits**: `#37` descriptions exceed character limits in Codex and fail to load; `#6` descriptions too sparse to route.
- **Cross-platform fail**: `#59` byte-budget test fails on every Windows checkout because **CRLF inflates the measured size**.
- Connection instability (`#10`, `#25`), logs unreadable (`#12`), editor UI bugs (`#34`, `#44`), version mismatch (`#43` Unity 2021), wrong API for child objects (`#24`).

**Lesson adopted.** The unified repo must be **non-invasive** (no auto-running editor hooks, no GUID/asmdef collisions, opt-in everything), **line-ending-safe**, and must **budget frontmatter** and enforce it in CI.

### E. mflRevan / UCP — *best tooling architecture*
**What it is.** A Rust `ucp` CLI + C# bridge giving structured, typed access to the Editor (lifecycle, scene authoring, assets, UI Toolkit, visual feedback, runtime debugging, project config, VCS), plus 9 skills **generated from the `skills/` source** and a machine-readable `skills/index.json`.

**Strengths.** **Single source of truth** (skills are authored once, all other artifacts are generated); machine-readable catalog with `compatibility`, `commands`, `version`; **visual feedback** (`screenshot`, `view capture|orbit`, `record` with `--slowdown`) so an agent can *see* results; explicit `[editor]` state line; omni + narrow-surface skill split.

**Weaknesses.** Requires the `ucp` CLI **and** a bridge package (hard dependency); small ecosystem; near-zero issue volume (few users yet).

**Lesson adopted.** Generate everything from one source; ship a `manifest.json`; make *visual verification* a first-class step; publish machine-checkable compatibility.

### F. Meta `agentic-tools` — *the best VR/MR skill set*
**What it is.** 30+ skills over Horizon OS/Quest, powered by `metavr` (device/app/perf control + 40+ MCP tools). Unity-relevant skills cover Meta XR Core SDK, **MR Utility Kit** (rooms/walls/anchors/NavMesh from scene data), Passthrough Camera Access, Movement SDK retargeting, face tracking, Quest UI, placement, TMP resources, code review, SDK upgrade, Platform SDK, device readiness, XR simulator install/control, Perfetto/simpleperf profiling, immersive design, store submission. `hz-quest-verify-first` is a **mandatory pre-flight** that forces verification against Meta sources before answering.

**Strengths.** Generator-driven README table; per-agent plugin manifests (Claude/Cursor/Codex/Copilot/Gemini); explicit "verify first" doctrine; best-in-class device performance tooling.

**Weaknesses observed (from issues).** MCP schema bugs (`#10`, `#14`, `#15`), a **connection leak at 99% CPU** (`#2`), **documentation errors** (`#3` wrong plugin name, `#8` wrong Codex instructions, `#11` install command), a **referenced-but-missing skill** (`#4` `hz-vrc-check` referenced by 4 files, directory absent), and a design critique: **`#12` "very all-or-nothing setup and very opinionated."**

**Lesson adopted.** "Verify first" is a great pattern; referenced paths must be link-checked in CI; setup must be incremental, not all-or-nothing; MCP tools must be schema-validated against real clients.

### G. Coplay / unity-mcp — *the most-used bridge and the richest issue corpus*
**What it is.** A Python MCP server + Unity package exposing 50+ tools (assets, scenes, scripts, tests, profiling, builds).

**Strengths.** Huge adoption, MIT, broad tool surface, many client installers.

**Weaknesses observed (from issues — the single best evidence source).**
- **Connection/transport fragility** dominates: `#643` reconnect → "no session"; `#672` request to auto-connect/keep-alive; `#532` a release "broke the HTTP server"; `#103` "Port in use"; `#430` persistent "Context Canceled"; `#664/#397/#406` Claude Desktop/Code connection failures; `#315` Codex timeout; `#311` Codex auto-setup; `#609` "Task exception was never retrieved".
- **Stale editor state**: `#474` *"Tools are often run without first ensuring the editor has updated the asset db and/or compiled."* ← the most important behavioural bug in the ecosystem.
- **Dependency aversion**: `#285` *"We can't depend on Python and uv installation to use the package."*
- **Context bloat**: `#302` a single response of ~13.3k tokens.
- Opinionated/wrong setup docs across clients (`#20`, `#189`, `#195`, `#308`, `#410`).

**Lesson adopted.** Define a **state-freshness protocol** (recompile + refresh + verify before any action); define **response budgets**; make dependencies optional with capability detection; treat transport as fallible and design an idempotent retry contract.

### H. JulianKerignard — *cleanest small pack*
18 skills, decision trees, step-by-step workflows, strict TOUJOURS/JAMAIS rules, cross-references, troubleshooting tables, a skill-map diagram, Rapid-Proto → Code-Gen gradient. Zero issues (small audience). **Lesson adopted:** decision trees + hard rules + cross-references; fast-prototype gradient.

### I. MuharremTozan — *pattern library*
~24 skills dedicated to GoF/architecture patterns (factory, builder, command, composition, decorator, DI, memento, MVC, observer, singleton, strategy, visitor, SO↔prefab bridge, asmdef management, code reviewer, data persistence, ECS patterns, event bus, FSM, interaction, UI data-binding, UI procedural) + a `planner` orchestrator. Zero issues. **Lesson adopted:** a dedicated *patterns* reference and a planner/orchestrator role for the router.

### J–L. Paradigm experiments
`openclaw-graph` (graph-native, Neo4j) proves skills can be *data*; `marcosotomac/unity-ai` proposes the **observe → act → verify** control loop; `skillissue/unity-quest-build` shows a *single high-value specialized* skill (build/simulate/profile/sideload/verify Quest). **Lesson adopted:** observe→act→verify as the canonical loop; a graduated "Quest build/verify" workflow.

---

## 3. Cross-cutting format analysis

| Aspect | A/B Unity | C Nice Wolf | D Besty | E UCP | F Meta |
|---|---|---|---|---|---|
| Frontmatter | `name`, `description`, `allowed-tools` | `name`, `description` | `name`, `description` | `name`, `description`, `compatibility`, `metadata` | `name`, `description`, `license` |
| Extra metadata | no | no | no | yes (`version`, `kind`, `raw`) | via `metadata` |
| Catalogs | none | none | module table | `skills/index.json` (generated) | README table (generated) |
| Docs split | `references/` | `references/` | `API_REFERENCE.md` | per-skill references | `references/` |
| Trigger strategy | description keywords | description keywords | description keywords | description + command list | **mandatory pre-flight skill** |

**Conclusion.** There is no shared schema. The only **standard** parts are `name` and `description`; anything else must live under `metadata` to remain portable. Our canonical schema therefore uses `name` + a **single-line, quoted, length-budgeted `description`** + optional `allowed-tools` + a `metadata:` map. This directly prevents the Unity `#44` YAML breakage and the Besty `#37` codex-limit failure.

---

## 4. Overlap map (duplication we must NOT reproduce)

| Topic | A Unity | C Nice Wolf | D Besty | H Julian | F Meta |
|---|---|---|---|---|---|
| XR / AR / VR | ✗ | ✅ | ✅ | ✗ | ✅ (VR/MR) |
| 2D | ✅ | ✅ | ~ | ✅ | ✗ |
| DOTS/ECS | ✗ | ✅ | ✅ | ✅ | ✗ |
| Multiplayer | ✅ | ✅ | ✅ | ✅ | ✗ |
| Save system | ✗ | ✅ | ✅ | ✅ | ✗ |
| Testing/CI | ~ | ✅ | ✅ | ✅ | ✗ |
| Performance/optimization | ✅ | ✅ | ✅ | ✅ | ✅ (device) |
| UI (Toolkit/uGUI/IMGUI) | ✅ | ✅ | ✅ | ✅ | ~ |
| Audio | ✅ | ✅ | ~ | ✅ | ~ |
| Animation | ✗ | ✅ | ✅ | ✅ | ~ |
| Architecture/patterns | ✗ | ✅ | ✅ | ✅ | ✗ |
| Monetization/services | ✅ | ✅ | ~ | ✗ | ✅ |

**Reading.** XR, 2D, performance, UI, multiplayer, save and architecture are each covered by **3–5** upstreams with *different advice*. This is exactly where conflicts arise (§5) and exactly where a synthesis adds value.

---

## 5. Conflict register (concrete, sourced, severity-rated)

| # | Conflict | Sides | Severity | Resolution policy |
|---|---|---|---|---|
| C1 | **Deprecated vs current XR APIs.** `openclaw-graph/ar-vr/unity-xr` uses `XRBaseInteractable`, `OnSelectEntered`, `FindObjectOfType`, `XRSettings.enabled`. Besty0728 explicitly lists those as **hallucinations** ("`OnGrab()`/`OnRelease()` are not the XRI event model → use `selectEntered`/`selectExited`"). | J-skill vs D | **Critical** | Ship one canonical XR claim set pinned to XRI 3.x/Unity 6, with a 2022-LTS compatibility appendix. Never mix dialects in examples. |
| C2 | **Test invocation.** Nice Wolf `#4` says replace raw `Unity -runTests -batchmode` with `unity test`; Julian and most others use the batchmode recipe. | C vs H + ecosystem | High | Capability-tiered: if Unity CLI tier is available use `unity test`; else batchmode. Both documented, one *chosen* by detection. |
| C3 | **Resources vs Addressables.** Julian `unity-addressables` (migrate off `Resources.Load`) vs numerous code samples across packs using `Resources.Load`/`FindObjectOfType` in `Start`. | H vs samples | High | ADR-0001: Addressables is the default; `Resources` allowed only for tiny immutable bootstrap data, with an explicit note. |
| C4 | **Singleton vs DI.** Tozan ships a "safe singleton" skill; Nice Wolf `unity-game-architecture` frames Service Locator vs DI and treats singletons as an anti-pattern in large projects. | I vs C | Medium | ADR-0002: interfaces + composition; singleton only for genuinely single-instance services with explicit lifetime; never global mutable state. |
| C5 | **Coroutine vs Awaitable vs UniTask.** Nice Wolf `unity-async-patterns` (Awaitable, double-await gotcha, cancellation) vs coroutine-based templates elsewhere vs Besty `unitask-design`. | C vs D | High | ADR-0003: `Awaitable` default on Unity 6; coroutines for frame-spread editor/simple work; UniTask only if already a dependency. |
| C6 | **Locomotion default.** Generic XR guides default to smooth/continuous locomotion; Unity/Meta comfort guidance and Nice Wolf demand comfort options and teleport. | D/N vs C/F | High | Hard rule: teleport + snap-turn + vignette default; smooth motion is opt-in. |
| C7 | **XRI version dialect.** Besty0728's `xr` module supports XRI **2.x (Unity 2022) and 3.x**; Nice Wolf targets **XRI 3.x / Unity 6**; Unity examples target latest. API/property names differ (`XRBaseInteractor` vs `NearFarInteractor`; `interactionLayers` vs `InteractionLayerMask`). | D vs C/A | High | Pin one primary dialect (Unity 6 / XRI 3.x) and provide a single compatibility table; no duplicated, divergent examples. |
| C8 | **Same skill names, different content.** `unity-2d`, `unity-dots`, `unity-audio`, `unity-multiplayer`, `unity-save`, `unity-test`, `unity-animation`, `unity-editor-tools`, `unity-performance`, `unity-xr` exist in **both** Nice Wolf and JulianKerignard (e.g. `unity-xr` also in openclaw-graph and skillsdirectory). | C vs H vs J vs M | **Critical** | Our namespace is unique (`loom-*`) and we define a **routing precedence** so co-installed packs cannot hijack our domains. |
| C9 | **Latest vs pinned.** Unity's own CLI skill says *always use the latest Unity CLI*; Meta/Unity plugin issues show CLI/SDK **drift** breaking users. | A vs B/F | Medium | ADR-0004: pin Unity + package versions; use the latest *CLI*; record versions in a build manifest. |
| C10 | **Executability.** Nice Wolf instructs GUI actions (`Use the Sprite Editor`); Unity official drives the Editor via CLI. | C vs A | High | Hard rule: **no GUI instructions**. Every step is CLI/eval/file-edit; if impossible, emit a `HUMAN HANDOFF` block with exact clicks and a rationale. |
| C11 | **Reflection vs typed APIs.** Besty's bridge is reflection-based (property names silently ignored if wrong) → requires reading `API_REFERENCE.md`; other packs use typed C#. | D vs others | Medium | Adapter rule: prefer typed Editor scripting; if reflection is used, require a pre-read of the canonical API table and a post-write read-back verification. |
| C12 | **Tooling invasiveness.** Besty auto-inserts editor detectors that caused infinite recompile loops; Meta's setup is "all-or-nothing". | D/F vs principle | High | Hard rule: tooling is opt-in, side-effect-free, reversible, and must not add MonoBehaviours/hooks that run without an explicit command. |

---

## 6. Issue-derived failure taxonomy (what users actually hit)

Mined from issue trackers of A–G plus the official samples. Counts are qualitative (volume of issues per cluster).

| ID | Failure cluster | Representative issues | Root cause | Design answer (in our repo) |
|---|---|---|---|---|
| F1 | **Transport unreliability** — disconnects, timeouts, "no session", port in use, HTTP broken after upgrade | `unity-mcp #643, #672, #532, #103, #430, #664, #397, #406, #315, #609`; `Besty #10, #25`; `Meta #2` | Long-lived socket/proc lifecycles, version drift, no health contract | Tool-agnostic: skills define *intent + verification*; adapters declare a health-check step and an idempotent retry contract; never assume a live session |
| F2 | **Stale editor state** — acting before asset DB refresh/compile | `unity-mcp #474` | No mandatory freshness gate | **State-freshness protocol** in the router pre-flight (P1) |
| F3 | **Setup/install sprawl & wrong docs** — per-client configs, wrong plugin names, wrong commands | `unity-mcp #311, #20, #189, #195, #308`; `Meta #3, #8, #11, #12`; `Besty #19, #23, #43` | N clients × N versions, docs untested | One spec-compliant install path (`npx skills add`) + **link/command CI checks**; adapters documented but never required |
| F4 | **Hard dependencies** | `unity-mcp #285` ("can't depend on Python/uv"); `E` requires `ucp`; `F` requires `metavr` | Tool coupling | **Zero-requirement core**; capability tiers with graceful degradation |
| F5 | **Context bloat** | `unity-mcp #302` (13.3k-token response) | Unfiltered tool output | **Response budget** doctrine: filter, paginate, summarize, cap bytes |
| F6 | **Frontmatter/YAML failure** — skills silently never load | `unity-agent-plugin #44` (4/29 skills!), `Besty #37` | Unquoted `": "`, length limits | Machine lint: quote + single-line + length cap + parse test in CI |
| F7 | **Non-executable instructions** | `Nice Wolf #8, #7` | Skills written for humans | Executable-only rule (C10) + handoff block |
| F8 | **Incorrect/overgeneralized claims** | `Nice Wolf #6`; XRI sample issues (`#15`, `#19`, `#51`) | No source verification | Claim registry with primary-source citations + `verify-first` pre-flight |
| F9 | **Tooling breaks the Editor** | `Besty #58` (infinite recompile), `#49` (perf regression), `#34/#44` UI bugs | Invasive hooks, unbounded state | Non-invasiveness rule (C12) + perf budget for tooling |
| F10 | **Asset/GUID collisions** | `Besty #41` (GUID collides with `unity-mcp`) | Shared package ids/GUIDs | No shipped Unity-package assets in v1; if added, namespaced + GUID-registry + CI check |
| F11 | **Cross-platform/line-ending failures** | `Besty #59` (CRLF byte budget) | Measuring raw bytes | CRLF-aware validation; test on Win/macOS/Linux |
| F12 | **Missing/broken references** | `Meta #4` (skill referenced but absent), `#61` (Unity CLI drift) | Manual cross-links | CI link-check across skills/workflows/manifest |
| F13 | **XR interaction bugs** (from samples/frameworks) | XRI `#26` destroy-interactable exception, `#29` manual release, `#19/#51` ForceSelect internal, `#30` jittery hands, `#21` edge grab, `#107` two-hand wheel, `#14` AR raycast blocked by GUI; UltimateXR `#32/#50` input lost after resume, `#80` Meta SDK 74 broke controllers, `#65` Quest 3 hand tracking, `#10` Mixamo, `#48` XRI support | Interaction lifecycle, device/SDK churn, avatar rigs | XR skill ships an **interaction lifecycle contract** (select/exit/destroy/release), a **resume/regain-input procedure**, and **device-SDK compatibility gates** |
| F14 | **AR session/visual failures** | ARF `#2` black screen (92 comments), `#988` iOS jitter with MT rendering, `#119/#165` reference-image library generation, `#586` image tracking stops updating, `#94` scene-switch crash, `#979` occlusion depth limit, `#1151` Xcode build failure | Rig/session setup, platform quirks | AR workflow ships a **deterministic setup checklist + failure triage table** for black screen, jitter, image libraries, occlusion, build |
| F15 | **Verification/harness paradoxes** | `Nice Wolf #14–#19, #29, #33, #34–#43` | Over-engineered permission/grader hooks | Keep verification *observable and simple*: logs + tests + screenshots; no hidden hook theatre |

**The five highest-leverage fixes** (drive the product): **F2** freshness, **F1/F3** transport & setup, **F5** context budget, **F6/F7/F8** skill correctness & executability, **F9/F10** non-invasiveness. XR-specific (F13/F14) drives the domain content.

---

## 7. What we keep, adapt, and drop

**Keep (patterns worth copying):**
- Router/omni + narrow-domain split (E).
- Correctness → architecture → design-intent tiering (C).
- Decision trees + hard rules (H) and pattern library (I).
- `verify-first` pre-flight (F).
- Observe → act → verify loop (L) and visual feedback via screenshots/recording (E).
- Machine-readable catalog generated from source (E, F).
- Anti-patterns and API quick-reference per topic (C, D).
- Explicit hallucination guardrails and collider/property matrices (D).
- Friendly 40k-ft workflow gradients: rapid-proto → production (H).

**Adapt (keep the idea, change the mechanics):**
- XR: merge AR Foundation + XRI + XR Hands + Meta MR + comfort into one coherent surface, with one dialect (Unity 6 / XRI 3.x) and one compatibility table.
- Performance: unify scattered tips into *device budgets* (mobile/Quest/PCVR/AR) + a single profiling order.
- Simulation/training: promote from incidental tips to a first-class domain (procedures, assessment, xAPI, multi-user, digital twin).
- Verification: keep it, but observable (logs/tests/screenshots), never hook theatre.

**Drop (anti-patterns we refuse to reproduce):**
- Vendored/duplicated guidance (one fact, one place).
- Hard Python/uv/Rust/CLI/bridge dependencies for core skills.
- GUI-click instructions.
- Auto-running editor hooks, presence detectors, unbounded history.
- Reusing colliding `unity-*` names.
- Per-client setup sprawl; unaudited install commands.
- Unbounded tool output.

---

## 8. Reference ledger (how we cite everything upstream)

Every upstream is recorded once, in `docs/ATTRIBUTION.md` and `references/upstream.md`, with: repo URL, license, what we took (idea, not text), and what we explicitly rejected. Non-negotiable rules:

1. **Ideas, not text.** No paragraph is copied; all wording is re-derived. Where an upstream phrase is uniquely load-bearing (e.g. a `hz-quest-verify-first` pre-flight concept), we describe it in our own words and link.
2. **License awareness.** MIT/Apache/CC0/Unlicense upstreams are safe to *learn from*; `NOASSERTION` (most Unity-Technologies repos) and **GPL-3.0** (`michidk/Unity-Script-Collection`) are flagged and never copied; Unity repos are used only as *documentation references*.
3. **Version pinning.** Each claim records the Unity/package version it was validated against.
4. **Traceability.** Every design element in our repo names the upstream(s) and failure cluster(s) that motivated it (see `references/traceability.md`).

---

## 9. Open questions & risks

| Risk | Impact | Mitigation |
|---|---|---|
| Upstream SDK churn (XRI/Meta/ARF) dates our guidance | Stale, wrong instructions | `verified-against` metadata per skill; quarterly review; CI reminder; `verify-first` pre-flight |
| Scope creep → bloat | The exact failure we are avoiding | Hard budgets + validator in CI; one fact per file; "no new file without a budget line" rule |
| We cannot test every agent harness | Silent load failures | Spec-compliant frontmatter + parse/lint tests + a tiny example skill test |
| No Unity installed in CI | Can't run Editor tests | Validate static artifacts (frontmatter, links, budgets, triggers); Editor tests run in an optional job with GameCI |
| Co-installed packs hijack routing | Wrong skill activates | Unique namespace + precedence contract + optional "deny-list" note for overlapping `unity-*` skills |
| License contamination | Legal exposure | No vendoring; attribution ledger; GPL/NOASSERTION flagged |

---

**Next documents:** `01-product-idea.md` (what this becomes) → `02-build-plan.md` (the intricate plan and contracts) → the implementation.
