# Worked Examples

How Unity Loom handles a request end to end. Each example is **illustrative of
the documented contract**, not a transcript. **Request** is quoted verbatim,
**Tier** is the detected capability and its fallback, **Route** is one domain
skill and one workflow, **Plan** holds executable steps, **Verification** holds
evidence, **Done when** is the gate, **Common mistakes** cite the rule that
stops them.

Command lines are representative: Unity CLI flags differ between releases and
between the `unity` CLI and the editor's `-batchmode` arguments, so run
`unity --help` first. Pre-flight:
[doctrine/02-capabilities.md](../doctrine/02-capabilities.md) and
[doctrine/03-state-freshness.md](../doctrine/03-state-freshness.md); routing:
[skills/unity-loom/SKILL.md](../skills/unity-loom/SKILL.md); facts:
[claims.md](claims.md).

## 1 - Pixel-perfect 2D with rule tiles
**Request.** "Set up a pixel-perfect 2D project with rule tiles"
**Tier.** T2 - bridge health check · **Fallback:** T1 builds, T0 edits.

**Route.** loom-2d -> [workflows/2d.md](../workflows/2d.md) - 2D triggers only.

**Plan.**
1. `Assets/2D/PixelArtSetup.cs`: point filter, uncompressed, 16 px/unit, `SaveAndReimport()`.
2. `Assets/2D/TilePaletteBuilder.cs`: `TilePalette` + `RuleTile` with neighbour rules, bound to `Grid`.
3. "Visual" `Tilemap` for art; "Collision" `Tilemap` + `CompositeCollider2D` for physics.

**Verification.** Log `2D: reimported 34 textures`; EditMode test green; one atlas batch in the frame debugger.

**Done when.** Pixel art crisp while moving, draw calls in budget, no per-frame allocation.

**Common mistakes.**
- Non-integer zoom breaks the pixel grid (loom-2d red line).
- Collision on the visual tilemap, not a composite (loom-2d red line).

## 2 - NavMesh character with a Cinemachine camera
**Request.** "Add a NavMesh character with a Cinemachine camera"
**Tier.** T2 - bridge reports the project open · **Fallback:** T1 for the bake and build.

**Route.** loom-3d -> [workflows/3d.md](../workflows/3d.md) - "navmesh" and "cinemachine" are 3D triggers.

**Plan.**
1. `Assets/3D/PlayerMotor.cs`: a `CharacterController` motor caching the controller in `Awake`.
2. `Assets/3D/BakeNavigation.cs`: bake the `NavMeshSurface` with `BuildNavMeshData`, then `NavMesh.AddNavMeshData`.
3. `Assets/3D/PatrolAgent.cs`: a `NavMeshAgent` taking waypoint destinations, logging `pathStatus` on arrival.
4. `Assets/3D/CineFollow.cs`: one Cinemachine brain, one `CinemachineCamera` (C-197), tuned damping; no manual `LateUpdate`.

**Verification.** Log `NavMesh baked: 120x120 bounds, 0 sources missing`; a PlayMode test walking the route to every waypoint.

**Done when.** The player crosses the level without getting stuck, navigation covers the playable area, a release-like build holds the target frame rate.

**Common mistakes.**
- A non-convex MeshCollider on a moving Rigidbody is invalid (C-041).
- Manual camera code fighting Cinemachine (loom-3d red line).

## 3 - A URP shader that is cheap on Quest
**Request.** "Write a URP shader that is cheap on Quest"
**Tier.** T1 - no bridge; `unity --version` returns 6000.3.12f1 · **Fallback:** T0 edits, batchmode build, HUMAN HANDOFF.

**Route.** loom-graphics -> [workflows/graphics.md](../workflows/graphics.md) - "urp" and "shader" are graphics triggers; XR is context.

**Plan.**
1. `Assets/Graphics/CheckPipeline.cs`: assert `defaultRenderPipeline` is a `UniversalRenderPipelineAsset` on every tier.
2. `Assets/Shaders/Quest/MobileLit.shader`: one light, no refraction, `multi_compile_instancing` (C-011), stereo macros (C-020).
3. `Assets/Graphics/SetQuestTextureFormat.cs`: `ASTC_6x6` for `Assets/Art/Quest` (C-043); keep the shader always-included so stripping cannot drop it (C-014).

**Verification.** Log `Pipeline: URP 17.x, consistent across 3 tiers`; a build log with no stripping warnings; a headset GPU frame-time reading before and after.

**Done when.** One pipeline everywhere, quality tiers work, SetPass in budget, shaders stereo-correct, floor device at target frame rate.

**Common mistakes.**
- Switching the render pipeline mid-project (loom-graphics red line).
- Unstripped shader variants inflating the build (C-014).

## 4 - Settings menu with rebinding and mixed audio
**Request.** "Build a settings menu with rebinding and mixed audio"
**Tier.** T2 - bridge confirms an idle Editor · **Fallback:** T1 for the mixer and tests, T0 for UXML and USS.

**Route.** loom-ui-audio -> [workflows/ui-audio.md](../workflows/ui-audio.md) - "rebinding" and "audio mixer" triggers; a screen and a mix, not a data model.

**Plan.**
1. `Assets/UI/Settings/SettingsScreen.uxml` and `.uss`: rows for volume, sensitivity, quality and bindings, styled in USS.
2. `Assets/UI/SettingsModel.cs`: a plain C# model with the values and a change event; the screen binds to it, no game logic inside.
3. `Assets/UI/BindingStore.cs`: rebind with `PerformInteractiveRebinding`, persist with `SaveBindingOverridesAsJson`, restore with `LoadBindingOverridesFromJson`.
4. `Assets/Audio/Master.mixer`: five groups - Master, Music, SFX, Voice, UI - SFX through pooled `AudioSource`s.

**Verification.** Log `Settings: 4 control schemes bound, overrides saved`; an EditMode test writing an override, reloading the model, asserting the same control.

**Done when.** One data-driven screen works, layouts scale without clipping, lists do not allocate per frame, every control scheme drives every action, audio routed and pooled.

**Common mistakes.**
- Rebuilding the screen every frame instead of binding to a model (loom-ui-audio red line).
- Text concatenated per frame instead of the TMP set-text overloads (C-045).

## 5 - Controller input dies after the Quest system menu
**Request.** "My Quest build loses controller input after the system menu pauses the app"
**Tier.** T3 - `metavr list` shows one Quest 3 · **Fallback:** T2 build and logs, HUMAN HANDOFF for the resume.

**Route.** loom-xr -> [workflows/xr.md](../workflows/xr.md) - "quest" and the pause symptom are XR triggers; performance only if frames dropped.

**Plan.**
1. `Assets/XR/ResumeHandler.cs`: on `OnApplicationFocus(true)` re-enable the interactors, re-register them with the `XRInteractionManager`, re-read the devices, then log `resume: interactors=2 devices=2`.
2. `Assets/XR/GrabCube.cs`: all five transitions - hover, select, hold, release, despawn - via `selectEntered` and `selectExited` (C-021), a non-trigger box collider plus a Rigidbody (C-023).
3. `Assets/XR/ComfortSettings.cs`: the locomotion and comfort defaults named in ADR-0006, exposed as runtime settings (C-027, ADR-0006).

```text
HUMAN HANDOFF
What:   Pause and resume the app on the headset with the system menu.
Why:    The system menu is a device gesture an agent cannot raise.
Steps:  1) Launch the build. 2) Raise the system menu, wait for the pause.
        3) Dismiss it, then squeeze the trigger on the test cube.
Verify: One "resume: interactors=2 devices=2" line, and the cube moves on hold.
```

**Verification.** Logcat line `resume: interactors=2 devices=2` right after the pause; no `MissingReferenceException`; a screenshot of the cube highlighted mid-hold.

**Done when.** Validation is clean, the interaction lifecycle and resume work on device, comfort options exist, performance holds over a long session.

**Common mistakes.**
- Assuming an SDK upgrade is harmless - one can break controller tracking (C-029).
- A trigger collider on an `XRGrabInteractable` breaks the grab (C-023).

## 6 - Training procedure with scoring and xAPI export
**Request.** "Build a training procedure with scoring and xAPI export"
**Tier.** T1 - unity CLI present, no bridge, no LMS · **Fallback:** T0 for scripts and data, HUMAN HANDOFF for the sign-off.

**Route.** loom-simulation -> [workflows/simulation.md](../workflows/simulation.md) - "training", "procedure" and "xapi" triggers; xr only if it ships on a headset.

**Plan.**
1. `docs/objectives/lockout.md`: the single measurable skill, its pass/fail criteria and the scope guard, agreed before any scene work.
2. `Assets/Data/Procedures/PumpStartup.asset`: a `ProcedureGraph` ScriptableObject - steps, per-step success and failure criteria, resume point - so content changes need no code change.
3. `Assets/Training/EventLog.cs`: log discrete events (step id, error type, attempt, elapsed time) and score from that log alone (C-061).
4. `Assets/Training/XapiEmitter.cs`: build xAPI statements, buffer to disk when the endpoint is down, flush on reconnect (C-060); read the LRS url and key from environment variables (doctrine/01-safety.md).

**Verification.** Log `xapi: 14 statements queued, buffered to disk`; an EditMode test replaying one event log twice and asserting an identical score.

**Done when.** The objective is measurable and met, scoring is deterministic, the procedure resumes correctly, analytics reach the endpoint, each tier verified on hardware.

**Common mistakes.**
- Scoring rendered observations instead of discrete events (C-061).
- Committing the LRS endpoint or its key to the repository (doctrine/01-safety.md).

## 7 - The build runs at 40 fps on device
**Request.** "The build is 40 fps on device - find out why"
**Tier.** T3 - `metavr list` reports the Quest 3 · **Fallback:** T2 editor profiling, HUMAN HANDOFF for the device soak.

**Route.** loom-performance -> [workflows/performance.md](../workflows/performance.md) - "fps" and the device symptom are performance triggers. A measured artefact outranks a domain default (precedence L1), so a capture naming the bottleneck outranks the graphics default of one post volume with per-tier overrides.

**Plan.**
1. `unity build --project-path . --build-target Android --build-name perf-base --development`, deploy it, capture a baseline on the headset over the same 60-second scene.
2. `Assets/Dev/FrameProbe.cs`: a `ProfilerRecorder` on the main-thread and GPU frame-time counters, one line per second into `FrameTimes.csv` on the device.
3. Name the dominant cost - CPU main thread, render thread or GPU - plus GC bytes per frame, and record it before changing anything.
4. Fix only what the capture names, one change at a time: cache the camera instead of `Camera.main` per frame (C-002), `TryGetComponent` (C-006), non-alloc queries (C-004), shared materials (C-010).

**Verification.** `FrameTimes.csv` showing a 25 ms baseline frame time and 0 B/frame steady-state GC after the fix; a before/after table; a 25-minute soak with no throttle.

**Done when.** The symptom is gone on the floor device, steady-state allocation is about 0 B per frame, draw calls and memory in budget, a 20+ minute soak holds the frame rate.

**Common mistakes.**
- Optimizing without a measurement before and after (loom-performance red line).
- A thermal verdict drawn from a 60-second run (loom-performance red line).

## 8 - Prepare the Quest store submission
**Request.** "Prepare the Quest store submission"
**Tier.** T1 - unity CLI present, no store credentials · **Fallback:** T0 for checklists and CI, HUMAN HANDOFF for the upload.

**Route.** loom-release -> [workflows/release.md](../workflows/release.md) - "store submission" and "release" triggers; performance only if a frame-rate claim is missing.

**Plan.**
1. `ProjectSettings/`: add Build Profiles for dev, internal and store with their defines, quality tier and IL2CPP backend (C-051, C-142, C-052).
2. `unity test --project-path . --test-platform editmode` and `unity test --project-path . --test-platform playmode` - the two Unity Test Framework modes (C-050); at T0 use the batchmode `-runTests` recipe (ADR-0011).
3. `.github/workflows/unity.yml`: a GameCI pipeline that validates, runs both test modes and uploads the Android artifact (C-053).
4. Smoke-launch the store build, reach the main menu, load a scene, assert a clean log, archive the manifest and upload the IL2CPP symbols.

```text
HUMAN HANDOFF
What:   Upload the signed release build and submit it for review.
Why:    Store credentials live outside the repo, and doctrine/01-safety.md
        requires confirmation before a store deployment.
Steps:  1) Hand over the signed .apk and its symbols. 2) Upload it in the
        store console with the metadata from docs/store-checklist.md.
        3) Submit for review and report the build id.
Verify: The console shows the build accepted for review, and the build id sits
        next to the archived manifest.
```

**Verification.** CI green with an uploaded artifact; a clean smoke-launch log; a complete `docs/store-checklist.md`; a manifest with commit and package versions; no secrets in the build output.

**Done when.** All shipping targets build from CI, all tests pass, smoke launches are clean, a release candidate carries symbols and a manifest, and no secrets ship.

**Common mistakes.**
- A release build with no smoke launch and no symbols upload (loom-release red line).
- A keystore or API token committed alongside the build (doctrine/01-safety.md).

## 9 - Design the save system and the data model
**Request.** "Design the save system and the data model"
**Tier.** T0 - no editor and no CLI, a text editor only · **Fallback:** none; every artifact is a file.

**Route.** loom-project -> [workflows/foundation.md](../workflows/foundation.md) - "save system" and "data model" triggers; this is architecture, so the foundation workflow.

**Plan.**
1. `docs/data-model.md`: name the entities, their ownership and lifetime; mark which are authored ScriptableObjects and which are runtime state; cite ADR-0001, ADR-0002, ADR-0003.
2. `Assets/Save/SaveEnvelope.cs`: a plain C# envelope with a `schemaVersion`, a payload and a migration chain, so an old save migrates forward instead of failing.
3. `Assets/Save/ISaveable.cs` and `SaveStore.cs`: one `ISaveable` per system, each returning its own section; `SaveStore` writes the envelope to `Application.persistentDataPath` as a new file and then a replace, so a crash mid-write cannot corrupt it.

**Verification.** `unity test --project-path . --test-platform editmode` - a `SaveRoundTrip` test writes a save, reads it back, compares field by field and migrates version 1 to 2.

**Done when.** The project is under version control, builds for its primary target, has assemblies with no cycles, a working vertical slice, written performance targets.

**Common mistakes.**
- Loading runtime content from `Resources` instead of Addressables (ADR-0001, C-007).
- Dumping the whole scene into one file instead of per-system sections (loom-project red line).

## 10 - The XR scene drops frames after post-processing
**Request.** "The XR scene drops frames after I add post-processing"
**Tier.** T2 - bridge reports the project open; no headset · **Fallback:** T1 build, HUMAN HANDOFF for the device capture.

**Route.** Conditional, and the condition is evidence. Three domains match: graphics (post-processing), xr (XR scene) and performance (frames). The lattice in [doctrine/00-precedence.md](../doctrine/00-precedence.md) decides it:

1. **L0 doctrine - nothing applies.** No destructive action is implied, so safety does not decide it.
2. **L1 measured evidence - the pivot.** "Drops frames" is a symptom, not a measurement. A capture is the only thing that outranks a recorded default: a headset capture naming the GPU as dominant routes to **loom-performance -> [workflows/performance.md](../workflows/performance.md)**, which loops back to graphics for the visual change and to xr for stereo. With no capture, the next layer decides, and the narrower subject wins: the post stack is the subject, so the route is **loom-graphics -> [workflows/graphics.md](../workflows/graphics.md)**, with xr consulted for stereo and comfort.
3. **L2 ADR default - nothing covers it.** ADR-0006 sets locomotion and comfort defaults, ADR-0005 the dialect; neither speaks to post-processing cost.
4. **L3 domain skill - specificity decides.** Two domains match and neither is cross-cutting, so the subject decides: the post stack, which is graphics.
5. **L4 and L5 - irrelevant.** An upstream idiom or a personal preference never outranks a measurement or a recorded default.

**Plan.**
1. Do not guess. If a headset profiler capture exists, read it, apply step 2, and name the file and counters that decided the route.
2. If no capture exists, ask the one disambiguating question below and stop there until it is answered.
3. On either branch the first move is the same: measure. `Assets/Dev/FrameProbe.cs` with a `ProfilerRecorder` on the GPU frame-time counter, the same 60-second scene, post stack on and off.
4. With numbers in hand, apply the graphics and xr constraints: one volume with per-tier overrides and no multi-pass stereo (C-012, C-020).

**Question asked when evidence is missing.**

> Do you have a profiler capture from the headset for the scene where the frames drop, and does it show the CPU main thread or the GPU as the dominant cost?

**Verification.** A capture file named in the reply with the counters that decided the route; a before/after `FrameTimes.csv` pair; a frame-debugger pass with the post stack's SetPass counts; a two-eye rendering check (C-020).

**Done when.** The measured cost of the post stack is known and the frame-rate target holds on the floor device, recorded as a capture rather than an opinion.

**Common mistakes.**
- Loading two domain skills at once and blending their advice, breaking the router's one-skill rule.
- Treating "drops frames" as proof of the cause, when only a capture names the dominant cost.

## 11 - A vague request that matches no domain
**Request.** "help me with my Unity project"
**Tier.** T1 - `unity --version` succeeds on `~/proj/new-game` · **Fallback:** T0 edits, builds emitted as commands.

**Route.** No match - the router stays in place and hands the work to [workflows/foundation.md](../workflows/foundation.md), the only workflow a project without a domain can follow. There is no domain skill to load, and inventing one is not allowed.

**Plan.**
1. `ProjectSettings/ProjectVersion.txt` and `Packages/manifest.json`: read the Unity version and the render pipeline, input system and test packages.
2. `docs/perf-targets.md`: write the floor device, target frame rate, memory and build-size budget - four values the user supplies (HUMAN HANDOFF, format as in example 5), not values you invent.
3. `Assets/Scripts/Runtime/{Core,Gameplay,Features}`, `Assets/Scripts/Editor`, `Assets/Tests/{EditMode,PlayMode}`: one assembly definition per folder, references pointing one way, no cycle.
4. `.gitignore`: ignore `Library/`, `Temp/`, `Logs/`, `obj/` and `Build/`, and keep asset serialization as text with visible meta files.

**Verification.** `docs/perf-targets.md` with the four values; the assembly definitions compiling with no dependency cycle; `unity build --project-path . --build-target Android --build-name dev` producing a clean artifact.

**Done when.** The repository is version-controlled, the primary target builds, the assemblies are cycle-free, one vertical slice works, and the performance targets are written.

**Common mistakes.**
- Guessing a domain for a vague request and starting feature work instead of the floor (router non-negotiables).
- Skipping the written targets, which leaves every later gate unfalsifiable (workflows/foundation.md, phase 1).

## TEMPLATE - your own example

Copy this skeleton, fill every slot and keep the shape identical, so the file
stays comparable. One fact stays in one place: cite claims and doctrine, never
restate them.

```text
## N - <short title>

**Request.** "<the user's prompt, verbatim>"
**Tier.** <T0|T1|T2|T3> - <how it was detected> · **Fallback:** <what happens without it>

**Route.** <domain skill> -> workflows/<name>.md (<why this route, not the neighbour>)

**Plan.**
1. <command, editor script or file edit>
2. <...>
3. <...>

**Verification.** <observable evidence per step: log line, test, build, screenshot, file diff>

**Done when.** <the workflow's gate, restated>

**Common mistakes.**
- <what a careless agent does> (<doctrine or claim that prevents it>)
- <...>
```

For an ambiguous request, list the precedence steps from
[doctrine/00-precedence.md](../doctrine/00-precedence.md), the branch taken for
each evidence state, and the single question asked when the evidence is missing.
For a step that needs a person, use the `HUMAN HANDOFF` block format owned by
[doctrine/01-safety.md](../doctrine/01-safety.md) §11.
