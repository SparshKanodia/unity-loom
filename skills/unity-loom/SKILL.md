---
name: unity-loom
description: "Use for any Unity request: it runs the mandatory pre-flight (safety, capability tier, state freshness), selects exactly one domain skill and its workflow, and resolves cross-domain conflicts by precedence instead of guessing. Start here before any Unity task."
allowed-tools: Read, Grep, Glob, Bash
metadata:
  loom: 1
  domain: router
  tier: 0
  triggers: ["unity", "my game", "the project", "unity editor", "scene", "prefab", "gameobject", "component", "unity version", "help with unity", "build my unity app"]
  budget: { lines: 140, bytes: 8000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/"]
---

# Unity Loom — Router

## When to use

- Every Unity request starts here; the router picks one domain skill.
- A request that names no domain trigger still starts here.
- A request that names two domains starts here, to be resolved by precedence.
- A request that is a question rather than a change stays here.

## When not to use

- The domain skill is already loaded and the task sits inside it -> stay
  there and follow its workflow.
- The request is a decision with no code behind it -> ask one question, then
  route.
- The request is about the repository itself, not about a Unity project ->
  read [AGENTS.md](../../AGENTS.md).

## Pick the approach

| Situation | Approach |
|---|---|
| One domain trigger matches | Load that skill and the workflow it names |
| Two or more domains match | Apply the resolution order in [doctrine/00-precedence.md](../../doctrine/00-precedence.md) |
| The order leaves a tie | Ask exactly one question, then stop |
| No trigger matches | Stay in the router and use [workflows/foundation.md](../../workflows/foundation.md) |
| An ADR covers the case | The ADR default wins, and the deviation is recorded |

Example: an XR frame-rate problem routes to **loom-performance**, because a
measured budget outranks a domain default, and then loops back to
**loom-xr**. A "save in VR" task routes to **loom-project**, which consults
**loom-xr** for the storage constraints of a headset.

## Routing table

Match the request against the **Trigger** column (whole word, case-insensitive). The trigger vocabulary below is canonical and identical to `manifest.json` and each skill's frontmatter; the validator fails the build if the three ever drift.

| Domain | Triggers | Skill | Workflow |
|---|---|---|---|
| project | architecture, asmdef, assembly definition, scriptableobject, save system, dependency injection, service locator, event bus, state machine, fsm, netcode, multiplayer, project setup, folder structure, version control, git, upm package, package manager, scene management, addressables | [loom-project](../loom-project/SKILL.md) | [foundation](../../workflows/foundation.md) |
| 2d | 2d, sprite, sprite atlas, tilemap, rule tile, pixel perfect, light2d, collider2d, rigidbody2d, 2d physics | [loom-2d](../loom-2d/SKILL.md) | [2d](../../workflows/2d.md) |
| 3d | 3d, navmesh, character controller, rigidbody, collider, terrain, probuilder, cinemachine, lod, occlusion culling, animation rigging, timeline, level design | [loom-3d](../loom-3d/SKILL.md) | [3d](../../workflows/3d.md) |
| graphics | urp, hdrp, render pipeline, shader, shader graph, hlsl, lighting, lightmap, reflection probe, post processing, vfx graph, particle system, batching, gpu instancing, decal, skybox | [loom-graphics](../loom-graphics/SKILL.md) | [graphics](../../workflows/graphics.md) |
| ui-audio | ui toolkit, uxml, uss, ugui, canvas, textmeshpro, tmp, hud, menu ui, audio mixer, sound, sfx, music, spatial audio, localization, input system, rebinding, gamepad, touch controls, accessibility | [loom-ui-audio](../loom-ui-audio/SKILL.md) | [ui-audio](../../workflows/ui-audio.md) |
| xr | xr, virtual reality, augmented reality, mixed reality, arfoundation, xri, openxr, quest, meta xr, visionos, polyspatial, hand tracking, passthrough, spatial anchor, plane detection, teleport, comfort, haptics, mruk, spatial computing, webxr, hololens, pico, steamvr | [loom-xr](../loom-xr/SKILL.md) | [xr](../../workflows/xr.md) |
| simulation | simulation, training, procedure, assessment, xapi, scorm, digital twin, instructional design, lms, instructor, cad import, asset transformer | [loom-simulation](../loom-simulation/SKILL.md) | [simulation](../../workflows/simulation.md) |
| performance | performance, profiler, optimize, optimization, memory, gc allocation, fps, draw calls, overdraw, stutter, thermal, bottleneck, frame debugger, renderdoc, memory leak | [loom-performance](../loom-performance/SKILL.md) | [performance](../../workflows/performance.md) |
| release | build, build profile, ci, cd, gameci, il2cpp, test, unit test, playmode, editmode, ship, release, store submission, crash reporting, security, privacy, obfuscation | [loom-release](../loom-release/SKILL.md) | [release](../../workflows/release.md) |

Router-owned broad terms (never route on these alone): unity, my game, the project, unity editor, scene, prefab, gameobject, component, unity version, help with unity, build my unity app.

Worked examples: [references/examples.md](../../references/examples.md).

## Setup defaults

The pre-flight runs in this order, and each check has one owning file:

| # | Check | Owner |
|---|---|---|
| 1 | Safety, blast radius, secrets | [doctrine/01-safety.md](../../doctrine/01-safety.md) |
| 2 | Capability tier and the fallback | [doctrine/02-capabilities.md](../../doctrine/02-capabilities.md) |
| 3 | Refresh, compile, read, act, read back | [doctrine/03-state-freshness.md](../../doctrine/03-state-freshness.md) |
| 4 | Filter, paginate, summarize, cap | [doctrine/04-responses.md](../../doctrine/04-responses.md) |
| 5 | No ambient side effects | [doctrine/05-non-invasiveness.md](../../doctrine/05-non-invasiveness.md) |

State the tier before the first edit. A missing tier downgrades the plan; it
never fails the task.

## Examples

[references/examples.md](../../references/examples.md) holds the end-to-end
worked examples. One shape to copy: name the chosen skill, the workflow, the
tier, the next two steps and the evidence that will close each of them.

## Red lines

- No GUI instruction and no ambient side effect: ADR-0007 and
  [doctrine/05-non-invasiveness.md](../../doctrine/05-non-invasiveness.md).
- No second copy of a doctrine rule or an API fact: link the owning file,
  and cite an id from [references/claims.md](../../references/claims.md).
- No guessing between two domains: the tie-break is one question.
- No step counted as done without the evidence its workflow names.
- No secret in a project, a log or a commit.

## Verify

- The reply names one skill, one workflow and the tier in force.
- The pre-flight ran, and the tier is written down.
- The next step is a command, an editor call or a file edit.
- The evidence that will close the step is named before the step starts.

## Handoff

- The domain skill owns its own detail; the router does not repeat it.
- A conflict between two domains goes to
  [doctrine/00-precedence.md](../../doctrine/00-precedence.md) and to the
  decision records in [docs/03-decision-records.md](../../docs/03-decision-records.md).
- A request with no owner stays in the router and follows
  [workflows/foundation.md](../../workflows/foundation.md).
