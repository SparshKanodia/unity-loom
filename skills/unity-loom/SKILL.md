---
name: unity-loom
description: "Entry router for Unity Loom. Use for any Unity request: it runs the mandatory pre-flight (safety, capability tier, state freshness), selects exactly one domain skill and its workflow, and resolves cross-domain conflicts by precedence instead of guessing. Start here before any Unity task."
allowed-tools: Read, Grep, Glob, Bash
metadata:
  loom: 1
  domain: router
  tier: 0
  triggers: ["unity", "my game", "the project", "unity editor", "scene", "prefab", "gameobject", "component", "unity version", "help with unity", "build my unity app"]
  budget: { lines: 120, bytes: 6000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/"]
---

# Unity Loom — Router

You are the single entry point. **Run the pre-flight, then route to exactly one domain skill.** Do not start domain work from here.

## 1. Pre-flight (always, in order)

1. **Safety** — [doctrine/01-safety.md](../../doctrine/01-safety.md). Risky action? Ask first, with blast radius.
2. **Capability tier** — [doctrine/02-capabilities.md](../../doctrine/02-capabilities.md). Probe, state the tier, plan the fallback.
3. **State freshness** — [doctrine/03-state-freshness.md](../../doctrine/03-state-freshness.md). Refresh → compile → read before acting; read back after.
4. **Output budget** — [doctrine/04-responses.md](../../doctrine/04-responses.md). Filter, paginate, summarize.
5. **Non-invasiveness** — [doctrine/05-non-invasiveness.md](../../doctrine/05-non-invasiveness.md). No ambient side effects.

## 2. Routing table

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

Worked examples of every route: [references/examples.md](../../references/examples.md).

## 3. When several match

Apply the precedence lattice in [doctrine/00-precedence.md](../../doctrine/00-precedence.md):

1. Safety → L0 wins.
2. An ADR covers it → [docs/03-decision-records.md](../../docs/03-decision-records.md) wins.
3. Measured evidence exists → cite it and it wins.
4. Otherwise the narrower domain wins.
5. Still tied → **ask one question**. Do not guess.

Example: an XR frame-rate problem routes to **loom-performance** (measured budget beats a domain default), then loops back to **loom-xr**. A "save in VR" task routes to **loom-project**, consulting **loom-xr** for storage constraints.

## 4. Non-negotiables

- **Executable only.** No GUI-click instructions. If a human is required, emit a `HUMAN HANDOFF` block.
- **One fact, one place.** Link doctrine and [references/claims.md](../../references/claims.md); never restate them.
- **Evidence or silence.** No version-specific API claim without a source in the claim registry.
- **Done means proven.** Every workflow ends at its "Done when" gate; a step is complete only with observable evidence.

## 5. Answer shape

Keep the reply small: (1) tier + detected project, (2) the chosen skill and workflow, (3) the next one or two concrete steps, (4) what evidence will prove it. Nothing else.
