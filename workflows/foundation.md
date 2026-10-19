# Workflow — Foundation

Owner domain: [loom-project](../skills/loom-project/SKILL.md).
Precondition: run once per project, before any gameplay code.
Template: [docs/07-workflow-template.md](../docs/07-workflow-template.md).

## When to use

- A new Unity project is starting and the folder and assembly layout is not
  decided yet.
- An existing project needs the version control, LFS and `ProjectSettings`
  discipline put in place before content arrives.
- A project has no CI yet, or its CI builds without ever running the tests.
- The editor version, the package set or the target platform is still open.
- A team wants the vertical slice and the build profiles defined up front.

## When not to use

- A project that is already set up and the request is about gameplay code ->
  [3d](3d.md) or [2d](2d.md), then the domain workflow of the feature.
- A request about the render pipeline, the look or the quality tiers ->
  [graphics](graphics.md), after this workflow has run once.
- A request about menus, HUD, text or audio routing -> [ui-audio](ui-audio.md).
- A request that is slow, leaks or stutters -> [performance](performance.md).
- A request about shipping, the store or a build profile -> [release](release.md).
- A question about Unity itself rather than a change to a project -> stay in
  [skills/unity-loom/SKILL.md](../skills/unity-loom/SKILL.md).

| Next | Enter it when | Then |
|---|---|---|
| [2d](2d.md) | a 2D template and 2D packages are chosen | graphics, ui-audio, release |
| [3d](3d.md) | a 3D template and 3D packages are chosen | graphics, performance, release |
| [graphics](graphics.md) | the pipeline asset exists | the look and quality tiers |
| [ui-audio](ui-audio.md) | the input system is pinned | menus, HUD, audio routing |
| [xr](xr.md) | a headset target is chosen | the XR dialect and comfort set |
| [simulation](simulation.md) | the training objective is written | assessment and reporting |
| [release](release.md) | a build profile exists | packaging and store steps |

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

Two documents this workflow names live in the **user's project**, not in this
repository: `docs/project-versions.md` and `docs/perf-targets.md`. They are
created in the project in phase 1. One of them missing at the phase that needs
it is a blocker, not a broken link: create the file, then continue.

## Steps

### Phase 1 — Floor

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

### Phase 2 — Version control and asset hygiene

- [ ] `git init`, then commit the untouched template as commit zero.
- [ ] Add the generated folders to `.gitignore`.
- [ ] Keep meta files visible and asset serialization in text, so every diff stays readable.
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
- **Gate:** a fresh clone opens with no missing reference.

### Phase 3 — Structure

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
  Scripts/Editor/
  Tests/EditMode/  Tests/PlayMode/
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

### Phase 4 — Packages and pipeline

- [ ] Pin the editor and every package version (ADR-0004).
- [ ] Commit `Packages/manifest.json` and `Packages/packages-lock.json`.
- [ ] Copy the pinned set into `docs/project-versions.md`.
- [ ] Choose one pipeline family and never mix pipelines; create one pipeline
      asset per platform tier and assign each to its matching quality level.
- [ ] Add Addressables for anything loaded at runtime (ADR-0001, C-007).
- [ ] Remove the template modules the project will not use.
- [ ] Add only the package set the chosen domain workflow needs.
- [ ] Verify the pipeline against the pinned package version before coding.

| Record | Where it lives | Rule |
|---|---|---|
| Editor version | `docs/project-versions.md` | one line, exact build |
| Package set | `Packages/manifest.json` | explicit versions, no ranges |
| Lock file | `Packages/packages-lock.json` | committed, never edited by hand |
| Pipeline asset | `Assets/Settings/` | one asset per platform tier (C-078) |

- **Gate:** a clean build of the template succeeds for the primary target.

### Phase 5 — Architecture backbone

- [ ] Model authored data as ScriptableObjects, not scene fields (C-076).
- [ ] Write the save format as versioned data with a migration path.
- [ ] Put the saved payload under `Application.persistentDataPath` (C-177).
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

### Phase 6 — Automation

- [ ] Add CI with the stages: validate, test, build, upload, using the
      community GameCI actions (C-053).
- [ ] Invoke tests per tier (ADR-0011) and record which one CI uses.
- [ ] Create the three build profiles: `dev`, `internal` and `store`
      (C-051, C-142).
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
      - name: validate
        run: node tools/validate.mjs
      - uses: game-ci/unity-test-runner@v4
        name: test
        with: { testMode: EditMode }
      - uses: game-ci/unity-builder@v4
        name: build
        with: { targetPlatform: StandaloneLinux64 }
      - uses: actions/upload-artifact@v4
        name: upload
        with: { name: unity-build, path: build/ }
```

- [ ] Point the validate stage at the project validator, or at the check the
      project already runs; the stage must fail the job on a non-zero exit.
- **Gate:** CI is green and produces a launchable artifact.

### Phase 7 — Agent readiness

- [ ] Commit a clean point before any agent-driven change.
- [ ] Record the capability tier and its fallback (doctrine 02).
- [ ] State the tool policy: no auto-running editor hooks (ADR-0010).
- [ ] Put the project rules in the repository `AGENTS.md`.
- **Gate:** `node tools/validate.mjs` is green and the tree is clean.

### Project settings that are usually wrong

| Setting | Correct default | If it is wrong |
|---|---|---|
| Colour space | Linear | washed-out or banded colour, wrong light |
| Active input handling | New Input System | actions never fire, or old calls break |
| Physics mode | 3D or 2D, never both | gravity on the wrong axis, lost contacts |
| Layer collision matrix | only pairs that interact | wasted solver work, false collisions |
| Quality levels | one per platform tier, set in the profile (C-142) | a device silently runs the wrong tier |
| Scripting backend | IL2CPP for shipping (C-052, C-100) | large builds, AOT surprises |
| Managed stripping | low in `dev`, higher in `store` (C-146, C-147) | types missing at runtime |
| Frame rate vs vSync | set one, never both (C-074) | the frame cap is ignored on desktop |
| Render pipeline asset | URP, one asset per platform tier (C-013, C-078) | mixed renderers, broken batching |

### Do not do yet

- No gameplay code before the vertical slice exists.
- No third-party SDK before the pipeline builds and CI is green.
- No custom shaders before the pipeline asset is chosen.
- No art production before the folder and LFS discipline is set (ADR-0010).
- No netcode, XR, or analytics packages before the floor device is chosen.
- No pipeline migration later; that is a separate decision, not a phase.

## Limitations

- The foundation workflow cannot validate art. It checks that a pipeline asset
  exists and that a build starts; the look of the game is the job of
  [graphics](graphics.md).
- It cannot validate gameplay. The vertical slice proves that the plumbing
  works, not that the game is fun.
- It does not own the store account, the signing identity or the listing;
  those belong to [release](release.md).
- The pipeline asset count, the quality tier count and the package set are
  project decisions, not a universal constant. This workflow gives the shape
  and the place to record the choice, not the answer.
- The target table in `docs/perf-targets.md` starts empty by design. A
  workflow cannot invent the floor device.
- It does not cover a live project that already shipped: there is no
  migration path from a legacy layout, only a fresh one.

## If a step fails

1. Stop at the failing gate. Do not start the next phase.
2. Revert the last change: `git revert <sha>` for a commit, or restore the
   file from the previous commit for a working-tree edit.
3. Re-read the phase gate and the file you changed, and confirm the revert
   landed: `git diff --stat` is empty for the reverted path.
4. Re-run the validator, `node tools/validate.mjs`, before retrying.
5. If the gate needs a store account, a licence decision, a signing identity
   or a physical device, emit a `HUMAN HANDOFF` block with What, Why, Steps
   and Verify, and stop.
6. If the same gate fails twice, record a deviation: the gate, the reason,
   the person who accepted it and the date, then continue or stop.

## Done when

- [ ] The editor version and package set are pinned and committed, and the
      pinned versions are read back from the lock file.
- [ ] The generated folders are ignored and binary assets are in LFS; the
      read-back of the attributes names the LFS filter.
- [ ] Meta files are visible and serialization is force text; both are read
      back from the version-control settings.
- [ ] `ProjectSettings/` is committed and a settings snapshot exists; a
      fresh clone shows the same values.
- [ ] The folder tree and the assembly layout exist and compile cleanly; the
      compile log holds no error line.
- [ ] `docs/perf-targets.md` has no empty cell; every row reads back with a
      value.
- [ ] The vertical slice works in a test scene and in an automated test; the
      test result file is green.
- [ ] CI is green and produces a launchable artifact; the run log and the
      artifact name are archived.
- [ ] The repository validator passes and the working tree is clean; the
      validator exits 0 and the porcelain status prints nothing.
