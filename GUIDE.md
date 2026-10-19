# GUIDE.md — the guided path through the repository

This file answers the questions an agent asks most often about Unity Loom and
names the one file that owns each answer. It is written for an agent that has
just opened the router and nothing else. A question answered here must not be
re-asked by reading the owning file: open that file only when the answer needs
detail, and cite it rather than restate it.

The working set: the router, one domain skill and one workflow are what a task
loads. Everything else here is a lookup, and this file is the index for those
lookups.

## 1. The five questions to answer before any action

| # | Question | Answer | Owner |
|---|---|---|---|
| 1 | What needs an explicit confirmation? | Deleting or overwriting scenes, prefabs, assets or project settings; rewriting history; changing build or CI config, licences or entitlements; uninstalling packages or moving the Unity version; writing outside the project; deploying to a store or a shared device. State the action, its blast radius and its undo, then wait for an explicit yes. | [doctrine/01-safety.md](doctrine/01-safety.md) §1, §10, §12 |
| 2 | Which capability tier am I at, and what if a tier is missing? | Probe read-only from T3 down to T0, at most twice per tier, and work at the highest tier whose probe passed and whose target the task names. A missing tier is a downgrade with a fallback, never a failure: use the fallback and name the proof you gave up. Never install a tool to raise a tier. | [doctrine/02-capabilities.md](doctrine/02-capabilities.md) §1-§3, §6, §8 |
| 3 | What do I refresh, compile and read before acting, and what do I read back after? | PROBE, REFRESH, COMPILE-WAIT, READ, ACT, READ-BACK, EVIDENCE. Never act while the editor compiles, reloads, imports, sits in play mode, holds a modal prompt, or has an unacknowledged unsaved scene. After every editor action, re-read the exact property that changed and report the value. | [doctrine/03-state-freshness.md](doctrine/03-state-freshness.md) §1, §3, §4 |
| 4 | What are the output caps? | Status line 5 lines; next steps 5 bullets; code patch 1 file unless more are asked for; log excerpt 40 lines; tool dump 100 lines; file listing 50 entries; scene or hierarchy dump 50 nodes; a diff shows the changed region only; profiler capture 20 rows; the final answer is result, evidence, next step. | [doctrine/04-responses.md](doctrine/04-responses.md) §1, §5 |
| 5 | What must not happen without an explicit command? | No auto-running editor hooks, presence detectors, file watchers, background daemons, telemetry from the agent's own tooling, global Unity or Hub preference edits, writes outside the project, stray files under Assets, or silent ProjectSettings and package changes. Read anything; write only what the task requires. | [doctrine/05-non-invasiveness.md](doctrine/05-non-invasiveness.md) §2, §4, §6 |

## 2. Which skill do I need?

The trigger words below are the canonical vocabulary. They are identical to
[manifest.json](manifest.json) and to each skill's frontmatter; the validator
fails the build if the three ever disagree.

| Request shape | Skill | Workflow | Trigger words |
|---|---|---|---|
| Project structure, packages, save data, netcode | [loom-project](skills/loom-project/SKILL.md) | [foundation](workflows/foundation.md) | architecture, asmdef, assembly definition, scriptableobject, save system, dependency injection, service locator, event bus, state machine, fsm, netcode, multiplayer, project setup, folder structure, version control, git, upm package, package manager, scene management, addressables |
| 2D sprites, tilemaps, 2D physics and lighting | [loom-2d](skills/loom-2d/SKILL.md) | [2d](workflows/2d.md) | 2d, sprite, sprite atlas, tilemap, rule tile, pixel perfect, light2d, collider2d, rigidbody2d, 2d physics |
| 3D characters, physics, NavMesh, levels, cameras | [loom-3d](skills/loom-3d/SKILL.md) | [3d](workflows/3d.md) | 3d, navmesh, character controller, rigidbody, collider, terrain, probuilder, cinemachine, lod, occlusion culling, animation rigging, timeline, level design |
| Pipeline, shaders, lighting, batching, the look | [loom-graphics](skills/loom-graphics/SKILL.md) | [graphics](workflows/graphics.md) | urp, hdrp, render pipeline, shader, shader graph, hlsl, lighting, lightmap, reflection probe, post processing, vfx graph, particle system, batching, gpu instancing, decal, skybox |
| Menus, HUD, text, input actions, audio routing | [loom-ui-audio](skills/loom-ui-audio/SKILL.md) | [ui-audio](workflows/ui-audio.md) | ui toolkit, uxml, uss, ugui, canvas, textmeshpro, tmp, hud, menu ui, audio mixer, sound, sfx, music, spatial audio, localization, input system, rebinding, gamepad, touch controls, accessibility |
| AR, VR, MR: OpenXR, the rig, comfort, haptics | [loom-xr](skills/loom-xr/SKILL.md) | [xr](workflows/xr.md) | xr, virtual reality, augmented reality, mixed reality, arfoundation, xri, openxr, quest, meta xr, visionos, polyspatial, hand tracking, passthrough, spatial anchor, plane detection, teleport, comfort, haptics, mruk, spatial computing, webxr, hololens, pico, steamvr |
| Training procedures, assessment, learning records, CAD | [loom-simulation](skills/loom-simulation/SKILL.md) | [simulation](workflows/simulation.md) | simulation, training, procedure, assessment, xapi, scorm, digital twin, instructional design, lms, instructor, cad import, asset transformer |
| Something slow, stuttering or leaking memory | [loom-performance](skills/loom-performance/SKILL.md) | [performance](workflows/performance.md) | performance, profiler, optimize, optimization, memory, gc allocation, fps, draw calls, overdraw, stutter, thermal, bottleneck, frame debugger, renderdoc, memory leak |
| Building, testing, CI, shipping and the store | [loom-release](skills/loom-release/SKILL.md) | [release](workflows/release.md) | build, build profile, ci, cd, gameci, il2cpp, test, unit test, playmode, editmode, ship, release, store submission, crash reporting, security, privacy, obfuscation |
| Any other Unity request, or a request naming no domain | [unity-loom](skills/unity-loom/SKILL.md) | none; the router names no workflow | unity, my game, the project, unity editor, scene, prefab, gameobject, component, unity version, help with unity, build my unity app |

## 3. What is the answer to the question I am actually asking?

| Question | Answer | Owner |
|---|---|---|
| Which render pipeline? | URP for cross-device work; HDRP only for high-end GI. One pipeline family, one asset per platform tier under `Assets/Settings/`, each bound to a matching quality level. Never the Built-in template. | [skills/loom-graphics/SKILL.md](skills/loom-graphics/SKILL.md), [workflows/foundation.md](workflows/foundation.md) phase 4, C-013, C-078 |
| Which input system? | The new Input System. One `InputActionAsset`, one map per context, one control scheme per device family, and `PlayerInput` for the devices of one player. | [skills/loom-ui-audio/SKILL.md](skills/loom-ui-audio/SKILL.md), C-094, C-095 |
| Which UI stack? | UI Toolkit for menus, HUD, panels and settings. uGUI only for a world-space overlay in XR and in 3D; an existing uGUI screen stays uGUI until it is rewritten. | ADR-0021 in [docs/03-decision-records.md](docs/03-decision-records.md) |
| Which XR dialect? | Unity 6 LTS, URP, XRI 3.x, AR Foundation 6.x and OpenXR. Current XRI names (`selectEntered`, `selectExited`), `XROrigin`, AR Foundation managers. | ADR-0005, [references/xr-dialect.md](references/xr-dialect.md) |
| Which delivery standard for training content? | xAPI for statements to a Learning Record Store; SCORM 2004 for a packaged course; SCORM 1.2 for a legacy portal; custom last. | [skills/loom-simulation/SKILL.md](skills/loom-simulation/SKILL.md) |
| Which assembly layout? | `Assets/Scripts/Runtime/{Core,Gameplay,Features}`, `Assets/Scripts/Editor`, `Assets/Tests/{EditMode,PlayMode}`, with the assemblies `Project.Runtime.Core`, `Project.Runtime.Gameplay`, `Project.Runtime.Features`, `Project.Editor`, `Project.Tests.EditMode`, `Project.Tests.PlayMode`. References point one way. | [workflows/foundation.md](workflows/foundation.md) phase 3 |
| Which build profile? | Three: `dev`, `internal` and `store`. The `store` profile carries IL2CPP, the symbols and the privacy declaration. | [workflows/foundation.md](workflows/foundation.md) phase 6, [skills/loom-release/SKILL.md](skills/loom-release/SKILL.md), C-051, C-142 |
| Where does a claim come from? | [references/claims.md](references/claims.md): an id, the statement, a primary source and the version it was verified against. Assert a claim by citing the id, not by restating it. | ADR-0012 |
| What if the claim does not exist? | Do not assert it. Verify against the primary source, then add a row to the registry. ADR-0012 has no escape hatch. | [references/claims.md](references/claims.md), ADR-0012 |
| What is a gate? | An observable pass/fail a workflow phase must clear before the next phase starts. At a failed gate: stop, revert, re-read, retry, and record a deviation if it fails twice. | the owning workflow under `workflows/`, [docs/07-workflow-template.md](docs/07-workflow-template.md) |
| What is a "Done when" proof? | The observable artefact the workflow names in its `## Done when` section: a log line, a test result, a screenshot, a build artefact or a capture. A self-report is not proof. | [docs/07-workflow-template.md](docs/07-workflow-template.md), [doctrine/03-state-freshness.md](doctrine/03-state-freshness.md) §5 |
| How do I report the tier? | One line naming the operating tier with the probe output that supports it, plus the fallback that applies if the adapter goes away. | [doctrine/02-capabilities.md](doctrine/02-capabilities.md) §7 |
| How do I hand a step to a human? | A `HUMAN HANDOFF` block: What, Why, Steps, Verify. It is the only shape, and it is a legitimate terminal step rather than a failure. | [doctrine/01-safety.md](doctrine/01-safety.md) §11 |
| What is a deviation record? | The `DEVIATION RECORD` block that every departure from an ADR default emits, naming the ADR, the reason, the evidence and the expiry. | [doctrine/00-precedence.md](doctrine/00-precedence.md) §3 |
| What if two sources disagree? | Run the resolution order: safety, then measured evidence, then the ADR default, then the narrower domain. If none of them decides, ask exactly one question. Emit a CONFLICT REPORT either way. | [doctrine/00-precedence.md](doctrine/00-precedence.md) §2, §4, §5 |
| Which layer wins? | L0 doctrine, L1 measured evidence, L2 ADR default, L3 domain skill, L4 upstream convention, L5 personal preference. A lower layer never overrides a higher one. | [doctrine/00-precedence.md](doctrine/00-precedence.md) §1 |
| What is the frame budget? | The project target refresh rate divided by one thousand, in milliseconds, read from the target table the foundation phase writes. Judge it at p95, and never hard-code it. | [skills/loom-performance/SKILL.md](skills/loom-performance/SKILL.md), [workflows/foundation.md](workflows/foundation.md) phase 1 |
| Which audio mixer groups? | `Master`, `Music`, `SFX`, `Voice` and `UI`, with ducking by snapshot. There is no sixth group. | [skills/loom-ui-audio/SKILL.md](skills/loom-ui-audio/SKILL.md), C-096 |
| Where do binding overrides live? | In `PlayerPrefs` on the device, written with `SaveBindingOverridesAsJson` and read back with `LoadBindingOverridesFromJson`. Never in the repository and never as a project asset. | [skills/loom-ui-audio/SKILL.md](skills/loom-ui-audio/SKILL.md), C-140, C-208 |
| What are the XR comfort defaults? | Teleport primary, snap turn 30 or 45 degrees, vignette on; smooth motion stays opt-in. ADR-0006 owns those numbers and no other file restates them. | ADR-0006 in [docs/03-decision-records.md](docs/03-decision-records.md) |
| What is the XR interaction lifecycle? | Hover, select, hold, release, despawn. The dialect file owns the five transitions, the collider matrix and the resume procedure. | [references/xr-dialect.md](references/xr-dialect.md) |
| How are OpenXR features set? | Feature groups and interaction profiles per build target in XR Plug-in Management, then read back at runtime. A feature name is never assumed in code. | [skills/loom-xr/SKILL.md](skills/loom-xr/SKILL.md), C-126, C-127 |

## 4. Which file do I open?

One line per file. Open a file when the column on the right matches the task.

| File | Owns | Open it when |
|---|---|---|
| [README.md](README.md) | the human entry point and the catalogue in prose | a human asks what this repository is |
| [AGENTS.md](AGENTS.md) | the agent contract: pre-flight, routing, hard rules | the task is about this repository or its rules |
| [GUIDE.md](GUIDE.md) | this file: the recurring answers and the file index | first, and again by section |
| [HARNESSES.md](HARNESSES.md) | the install matrix, one row per harness | installing, or a skill does not load |
| [CONTRIBUTING.md](CONTRIBUTING.md) | how to contribute a change here | before editing this repository |
| [manifest.json](manifest.json) | the machine catalogue: skills, triggers, budgets, adapters | the question is about the catalogue or a trigger |
| [LICENSE](LICENSE) | the MIT licence of this repository | a licence question is asked |
| [skills/unity-loom/SKILL.md](skills/unity-loom/SKILL.md) | the router: the routing table and the answer shape | every Unity request starts here |
| [skills/loom-project/SKILL.md](skills/loom-project/SKILL.md) | project layout, architecture, data, save, netcode | a structure or architecture change |
| [skills/loom-2d/SKILL.md](skills/loom-2d/SKILL.md) | sprites, tilemaps, 2D physics, 2D lighting | a 2D rendering or physics task |
| [skills/loom-3d/SKILL.md](skills/loom-3d/SKILL.md) | characters, physics, NavMesh, LOD, Cinemachine, Timeline | a 3D scene, character or level task |
| [skills/loom-graphics/SKILL.md](skills/loom-graphics/SKILL.md) | pipeline assets, quality tiers, shaders, lighting, batching | a change to how the game renders |
| [skills/loom-ui-audio/SKILL.md](skills/loom-ui-audio/SKILL.md) | UI Toolkit, uGUI, text, input actions, the audio mixer | an interface, input or sound task |
| [skills/loom-xr/SKILL.md](skills/loom-xr/SKILL.md) | OpenXR setup, the XRI rig, AR managers, comfort | an AR, VR or MR target |
| [skills/loom-simulation/SKILL.md](skills/loom-simulation/SKILL.md) | procedures, assessment, xAPI and SCORM, digital twins | training or instructional content |
| [skills/loom-performance/SKILL.md](skills/loom-performance/SKILL.md) | profiling, GC, draw calls, memory, the budgets | something slow, stuttering or leaking |
| [skills/loom-release/SKILL.md](skills/loom-release/SKILL.md) | build profiles, IL2CPP, tests, CI, the store | building, testing, automating or shipping |
| [workflows/foundation.md](workflows/foundation.md) | the project setup phases, the layout, the build profiles | a new project, or once per project |
| [workflows/2d.md](workflows/2d.md) | the 2D authoring and import sequence | a 2D feature after the foundation |
| [workflows/3d.md](workflows/3d.md) | the 3D scene, level and rig sequence | a 3D feature after the foundation |
| [workflows/graphics.md](workflows/graphics.md) | pipeline, quality tiers, lighting and batching | the look of the game |
| [workflows/ui-audio.md](workflows/ui-audio.md) | screens, input, localization, audio routing | an interface or sound feature |
| [workflows/xr.md](workflows/xr.md) | the XR setup, verification and comfort sequence | a headset or handheld target |
| [workflows/simulation.md](workflows/simulation.md) | objectives, the procedure model, scoring, reporting | a training module |
| [workflows/performance.md](workflows/performance.md) | symptom to budget, baseline, artefact layout | a performance investigation |
| [workflows/release.md](workflows/release.md) | build, verification matrix, store, privacy | a release candidate |
| [doctrine/00-precedence.md](doctrine/00-precedence.md) | the L0-L5 lattice and the conflict algorithm | two sources disagree |
| [doctrine/01-safety.md](doctrine/01-safety.md) | confirmation, secrets, untrusted content, paths, the handoff block | a risky action, a secret, or a blocked step |
| [doctrine/02-capabilities.md](doctrine/02-capabilities.md) | tiers, probes, fallbacks, reporting the tier | you must know the tier you work at |
| [doctrine/03-state-freshness.md](doctrine/03-state-freshness.md) | the read-act-read-back loop and the evidence taxonomy | any editor action |
| [doctrine/04-responses.md](doctrine/04-responses.md) | the output caps and the answer shape | the answer is getting long |
| [doctrine/05-non-invasiveness.md](doctrine/05-non-invasiveness.md) | what must not run by itself, and the finish checklist | you are about to add something |
| [doctrine/06-collaboration.md](doctrine/06-collaboration.md) | branches, worktrees, hand-over, file ownership | another agent or human is present |
| [doctrine/07-quality.md](doctrine/07-quality.md) | tests, error handling, logging, determinism, accessibility | writing or reviewing code |
| [references/claims.md](references/claims.md) | the claim registry: id, claim, source, version | you are about to assert an API fact |
| [references/xr-dialect.md](references/xr-dialect.md) | XR names, the lifecycle, the collider matrix, the resume | any XR code is written |
| [references/anti-patterns.md](references/anti-patterns.md) | the recurring mistakes and their fixes | a symptom matches a known failure |
| [references/adapters.md](references/adapters.md) | adapter mechanics: health, retry, per-tool failures | a bridge or the CLI is involved |
| [references/examples.md](references/examples.md) | worked end-to-end examples | you need a worked shape to copy |
| [references/traceability.md](references/traceability.md) | the audit map from an upstream idea to its owner | a design decision is questioned |
| [references/upstream.md](references/upstream.md) | the upstream ledger and the licence position | a licence or a credit question |
| [docs/00-repository-synthesis.md](docs/00-repository-synthesis.md) | the evidence base of conflicts and failures | the reason behind a rule is asked |
| [docs/01-product-idea.md](docs/01-product-idea.md) | the product, its scope, its anti-bloat charter | a scope or bloat question |
| [docs/02-build-plan.md](docs/02-build-plan.md) | the information architecture and the machine-enforced contracts | the repository layout is questioned |
| [docs/03-decision-records.md](docs/03-decision-records.md) | ADR-0001 to ADR-0024: defaults, hatches, status | a default is needed for a case |
| [docs/04-failure-modes.md](docs/04-failure-modes.md) | the failure clusters and their mitigations | a risk or a review question |
| [docs/05-attribution.md](docs/05-attribution.md) | the narrative credit ledger | an attribution question |
| [docs/06-context-budget.md](docs/06-context-budget.md) | what a budget is for, and the human copy of the numbers | a size limit is questioned |
| [docs/07-workflow-template.md](docs/07-workflow-template.md) | the contract every workflow satisfies | a workflow is written or reviewed |
| [tools/validate.mjs](tools/validate.mjs) | the repository validator and its self-test | before every commit, and in CI |
| [tools/install.mjs](tools/install.mjs) | the installer, plus doctor and verify | installing the skills |
| [tools/perf-budget.mjs](tools/perf-budget.mjs) | compares a captured metrics file against a budget | a performance artefact exists |
| [tools/README.md](tools/README.md) | the tool documentation, the rule list, the exit codes | a tool flag or exit code is unclear |

## 5. The traps

| Trap | The rule that prevents it |
|---|---|
| Restating a doctrine rule instead of linking it | one fact, one place: cite the owning file, never copy it (ADR-0019) |
| Asserting a version-specific API fact with no claim | cite a `C-nnn` id, or verify and add the row first (ADR-0012) |
| Writing a step that needs a GUI control | executable-only: a command, an editor call, a file edit, or a handoff (ADR-0007) |
| Trusting a tool that reported success with no read-back | a tool reporting success without a read-back is not evidence (doctrine 00 §6) |
| Hard-coding a number the project owns, such as a frame budget or a quality tier | read the value from the project target table (skills/loom-performance) |
| Quoting an ADR default after a measurement contradicts it | evidence beats defaults; cite the artefact and record a deviation (ADR-0017) |
| Installing the skills without the shared corpus | every link then dangles; install with `tools/install.mjs` and run verify (HARNESSES.md) |
| A skill that names a workflow which does not exist | the manifest is the catalogue; the validator checks the wiring |
| Editing a file another agent owns | one owner per file: ask for it, and state your tree in every reply (doctrine 06 §8) |
| Leaving a temp file behind | the finish checklist: no temp, scratch or backup file in the project (doctrine 05 §12) |

## 6. The vocabulary

| Term | Meaning | Defined in |
|---|---|---|
| tier | the capability level T0-T3 that the work runs at | [doctrine/02-capabilities.md](doctrine/02-capabilities.md) §1 |
| gate | an observable pass/fail a workflow phase must clear | [docs/07-workflow-template.md](docs/07-workflow-template.md) |
| evidence | the one artefact that proves a step: a log, a test result, a screenshot, a build, a capture | [doctrine/03-state-freshness.md](doctrine/03-state-freshness.md) §5 |
| pre-flight | the five checks that run before any action | [AGENTS.md](AGENTS.md) §2 |
| handoff | a `HUMAN HANDOFF` block that transfers a blocked step to a human | [doctrine/01-safety.md](doctrine/01-safety.md) §11 |
| ADR | a decision record: context, default, escape hatch, why, consequences, status | [docs/03-decision-records.md](docs/03-decision-records.md) |
| deviation record | the block that records a departure from an ADR default | [doctrine/00-precedence.md](doctrine/00-precedence.md) §3 |
| claim | a version-specific fact with a source and a verified-against version | [references/claims.md](references/claims.md) |
| router | the skill every request starts at; it picks exactly one domain skill | [skills/unity-loom/SKILL.md](skills/unity-loom/SKILL.md) |
| domain skill | one of the nine skills that owns a subject and names its workflow | [manifest.json](manifest.json) |
| workflow | a gated process: phases, gates, recovery, `Done when` | [docs/07-workflow-template.md](docs/07-workflow-template.md) |
| doctrine | the L0 rules; absolute, and every other file points at them | [doctrine/00-precedence.md](doctrine/00-precedence.md) |
| reference | a file read on demand: a table, a ledger, a guide | [manifest.json](manifest.json) |
| shared corpus | the copy of the corpus installed beside the skills so the links resolve | [HARNESSES.md](HARNESSES.md) |
| Done when | the workflow gate that names the proof the work is finished | [docs/07-workflow-template.md](docs/07-workflow-template.md) |

## 7. The short version

Ten lines for a system prompt:

```text
1. Start at the router: skills/unity-loom/SKILL.md.
2. Run the five pre-flight checks; each check owns the decision, not you.
3. Probe the capability tier. A missing tier downgrades the plan, never fails it.
4. Load one domain skill and one workflow. A tie is one question, never a guess.
5. Precedence: doctrine, then measured evidence, then an ADR default, then the skill.
6. A version-specific fact needs a claim id from references/claims.md, or it is not asserted.
7. Every editor action ends in a read-back of the exact property that changed.
8. Every step ends in the evidence its workflow names. A tool saying success is not evidence.
9. A number the project owns comes from the project, never from your memory.
10. Leave the project as you found it, and name what changed, where, and what proves it.
```
