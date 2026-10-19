# Workflow — Foundation

Owner domain: [loom-project](../skills/loom-project/SKILL.md).
Precondition: run once per project, before any gameplay code.

## Before you start

- Run the pre-flight: [doctrine/01-safety.md](../doctrine/01-safety.md) and
  [doctrine/02-capabilities.md](../doctrine/02-capabilities.md).
- Operating tier: T0 (file edit) is enough; T1+ adds build and test evidence.
- At T0 every gate below needs a file diff or a CLI result as its proof.
- A lower tier means fewer Editor-only checks, not fewer gates.
- One thing must be true before phase 1: the editor version and the target
  platform are decided and written down.
- Nothing may be committed before phase 2 is green.
- Every `C-xxx` id refers to [references/claims.md](../references/claims.md).
- An ADR beats any default here: see
  [docs/03-decision-records.md](../docs/03-decision-records.md).
- Repeated mistakes are listed in
  [references/anti-patterns.md](../references/anti-patterns.md).

## Phase 1 — Floor

- [ ] Create the project from a template that matches the target.
- [ ] Never ship the Built-in render pipeline template (see C-013).
- [ ] Record the editor version in `docs/project-versions.md`.
- [ ] Fill in the target table in `docs/perf-targets.md`.
- [ ] Keep the target table in the repository, not in a chat log.

| Target | Value to fill in | Notes |
|---|---|---|
| Floor device | | oldest device you support |
| Target frame rate | | measured on the floor device |
| Memory budget | | resident MB at peak |
| Build size | | per platform, compressed |
| Thermal soak | | minutes before throttling |
| Draw-call budget | | worst-case per frame |

- **Gate:** `docs/perf-targets.md` has no empty cell.

## Phase 2 — Version control and asset hygiene

- [ ] `git init`, then commit the untouched template as commit zero.
- [ ] Add the generated folders to `.gitignore`.
- [ ] Set meta files visible and asset serialization to force text.
- [ ] Commit the whole `ProjectSettings/` folder, and keep it as the
      reference snapshot of the settings.
- [ ] Track binary art and audio through LFS.
- [ ] Confirm no credential ever reaches the repository.

```gitignore
/Library/
/Temp/
/Obj/
/obj/
/Logs/
/Build/
/Builds/
/UserSettings/
*.csproj
*.sln
```

```gitattributes
*.psd  filter=lfs diff=lfs merge=lfs -text
*.fbx  filter=lfs diff=lfs merge=lfs -text
*.blend filter=lfs diff=lfs merge=lfs -text
*.wav  filter=lfs diff=lfs merge=lfs -text
*.mp3  filter=lfs diff=lfs merge=lfs -text
*.png  filter=lfs diff=lfs merge=lfs -text
*.tga  filter=lfs diff=lfs merge=lfs -text
*.exr  filter=lfs diff=lfs merge=lfs -text
```

- [ ] `git lfs install`, then `git add .gitattributes` and commit it.
- [ ] Clone the repository to a scratch path and open the clone.
- **Gate:** a fresh clone opens with no missing references.

## Phase 3 — Structure

- [ ] Create the folder tree below and commit it.
- [ ] Split scripts into runtime, editor and test assemblies.
- [ ] Give every assembly definition an explicit reference list.
- [ ] Keep the dependency direction one-way: editor and tests may reference
      runtime, never the reverse.
- [ ] Name every new layer, tag, and action map before first use.

```text
Assets/
  Art/Characters/  Art/Environment/  Art/UI/  Art/VFX/
  Audio/SFX/  Audio/Music/  Audio/Voice/
  Materials/  Prefabs/  Scenes/  Settings/
  ScriptableObjects/  UI/  ThirdParty/
  Scripts/Runtime/Core/  Scripts/Runtime/Gameplay/  Scripts/Runtime/Features/
  Scripts/Editor/  Scripts/Tests/EditMode/  Scripts/Tests/PlayMode/
```

| Assembly | May reference | Purpose |
|---|---|---|
| `Project.Runtime.Core` | none | shared types and interfaces |
| `Project.Runtime.Gameplay` | Core | systems and MonoBehaviours |
| `Project.Runtime.Features` | Core, Gameplay | one assembly per feature |
| `Project.Editor` | Runtime | editor tooling and inspectors |
| `Project.Tests.EditMode` | Runtime, Editor | fast logic tests |
| `Project.Tests.PlayMode` | Runtime | scene and physics tests |

- **Gate:** the assemblies compile with no cycle and no missing reference.

## Phase 4 — Packages and pipeline

- [ ] Pin the editor and every package version (ADR-0004).
- [ ] Commit `Packages/manifest.json` and `Packages/packages-lock.json`.
- [ ] Copy the pinned set into `docs/project-versions.md`.
- [ ] Choose the render pipeline asset once and never mix pipelines.
- [ ] Add Addressables for anything loaded at runtime (ADR-0001).
- [ ] Remove the template modules the project will not use.
- [ ] Add only the package set the chosen domain workflow needs.
- [ ] Verify the pipeline against the pinned package version before coding.

| Record | Where it lives | Rule |
|---|---|---|
| Editor version | `docs/project-versions.md` | one line, exact build |
| Package set | `Packages/manifest.json` | explicit versions, no ranges |
| Lock file | `Packages/packages-lock.json` | committed, never edited by hand |
| Pipeline asset | `Assets/Settings/` | one asset, chosen in phase 1 |

- **Gate:** a clean build of the template succeeds for the primary target.

## Phase 5 — Architecture backbone

- [ ] Model authored data as ScriptableObjects, not scene fields.
- [ ] Write the save format as versioned data with a migration path.
- [ ] Choose the communication pattern: references, then event channels, then
      a bus only when the fan-out is real (ADR-0002).
- [ ] Use `Awaitable` for engine async work (ADR-0003, C-005).
- [ ] Define the vertical slice before writing feature code.
- [ ] Write the slice as a PlayMode test, not as a manual play session.

| Vertical slice | In | Out | Proof |
|---|---|---|---|
| Move the player | input action | position delta | PlayMode test asserts motion |
| Read player state | runtime data | ScriptableObject field | EditMode test asserts the value |
| Save and load | state object | restored state | EditMode test round-trips |
| Load a level | scene request | loaded scene | PlayMode test asserts the scene |

- **Gate:** the vertical slice runs in a test scene and in a test.

## Phase 6 — Automation

- [ ] Add CI with the stages: validate, test, build, upload.
- [ ] Invoke tests per tier (ADR-0011) and record which one CI uses.
- [ ] Create build profiles for dev and release (C-051).
- [ ] Archive a build manifest: commit, editor version, package versions.
- [ ] Cache the import cache so CI stays fast but reproducible.

```yaml
name: unity-ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { lfs: true }
      - uses: game-ci/unity-test-runner@v4
        with: { testMode: EditMode }
      - uses: game-ci/unity-builder@v4
        with: { targetPlatform: StandaloneLinux64 }
```

- **Gate:** CI is green and produces a launchable artifact.

## Phase 7 — Agent readiness

- [ ] Commit a clean point before any agent-driven change.
- [ ] Record the capability tier and its fallback (doctrine 02).
- [ ] State the tool policy: no auto-running editor hooks (ADR-0010).
- [ ] Put the project rules in the repository `AGENTS.md`.
- **Gate:** `node tools/validate.mjs` is green and the tree is clean.

## Project settings that are usually wrong

| Setting | Correct default | If it is wrong |
|---|---|---|
| Colour space | Linear | washed-out or banded colour, wrong light |
| Active input handling | New Input System | actions never fire, or old calls break |
| Physics mode | 3D or 2D, never both | gravity on the wrong axis, lost contacts |
| Layer collision matrix | only pairs that interact | wasted solver work, false collisions |
| Quality levels | one per platform, set in the profile | a device silently runs the wrong tier |
| Scripting backend | IL2CPP for shipping (C-052) | large builds, AOT surprises |
| Managed stripping | low in dev, higher in release | types missing at runtime |
| Frame rate vs vSync | set one, never both | the frame cap is ignored on desktop |
| Render pipeline asset | URP, chosen once (C-013) | mixed renderers, broken batching |

## Do not do yet

- No gameplay code before the vertical slice exists.
- No third-party SDK before the pipeline builds and CI is green.
- No custom shaders before the pipeline asset is chosen.
- No art production before the folder and LFS discipline is set (ADR-0010).
- No netcode, XR, or analytics packages before the floor device is chosen.
- No pipeline migration later; that is a separate decision, not a phase.

## Handoff

| Next | Enter it when | Then |
|---|---|---|
| [2d](2d.md) | a 2D template and 2D packages are chosen | graphics, ui-audio, release |
| [3d](3d.md) | a 3D template and 3D packages are chosen | graphics, performance, release |
| [graphics](graphics.md) | the pipeline asset exists | the look and quality tiers |
| [ui-audio](ui-audio.md) | the input system is pinned | menus, HUD, audio routing |
| [xr](xr.md) | a headset target is chosen | the XR dialect and comfort set |
| [simulation](simulation.md) | the training objective is written | assessment and reporting |
| [release](release.md) | a build profile exists | packaging and store steps |

## Done when

- [ ] The editor version and package set are pinned and committed.
- [ ] The generated folders are ignored; binary assets are in LFS.
- [ ] Meta files are visible and serialization is force text.
- [ ] `ProjectSettings/` is committed and a settings snapshot exists.
- [ ] The folder tree and the assembly layout exist and compile cleanly.
- [ ] `docs/perf-targets.md` has no empty cell.
- [ ] The vertical slice works in a test scene and in an automated test.
- [ ] CI is green and produces a launchable artifact.
- [ ] The repository validator passes and the working tree is clean.
