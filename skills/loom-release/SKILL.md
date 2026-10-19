---
name: loom-release
description: "Use for Unity build, test, CI and release work: Build Profiles, IL2CPP and stripping, EditMode and PlayMode tests, GitHub Actions with GameCI, crash reporting, store submission and shipping security and privacy. Apply it whenever a project is built, tested, automated or shipped."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
metadata:
  loom: 1
  domain: release
  tier: 9
  triggers: ["build", "build profile", "ci", "cd", "gameci", "il2cpp", "test", "unit test", "playmode", "editmode", "ship", "release", "store submission", "crash reporting", "security", "privacy", "obfuscation"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/BuildSettings.html", "docs.unity3d.com/6000.3/Documentation/Manual/Testing.html", "game.ci/docs"]
---

# loom-release — Build, Test & Ship

Router role: pick the release kind, apply the defaults, then run
[workflows/release.md](../../workflows/release.md). Test invocation is
capability-tiered (ADR-0011).

## When to use

- A build has to be produced, signed or archived.
- The build profiles, the scripting backend or the stripping level are open.
- A test suite has to run, in the editor or in CI.
- The pipeline has to be automated, or a CI stage is failing.
- The project is submitted to a store, or a crash reporter is added.
- The security or the privacy posture of the shipped build is reviewed.

## When not to use

- A question about Unity itself rather than a change -> stay in the router,
  [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- The frame rate, the thermals or the memory budget ->
  [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- The folder layout, the assemblies or the data architecture ->
  [../loom-project/SKILL.md](../loom-project/SKILL.md).
- The look of the game -> [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- The privacy of training data and the learner records ->
  [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).

## Pick the approach

| Kind | Profile | Required pipeline | Evidence | Risk |
|---|---|---|---|---|
| Dev | `dev` | a local build on the `dev` profile | build log, zero errors | Low; never distributed |
| Internal playtest | `internal` | a CI build with tester-group signing | artifact, checksum, tester install | Medium; leaks without a profile gate |
| Store | `store` | a CI build with IL2CPP, symbols, metadata and a privacy declaration | checksummed artifact, device install, receipt | High; rejection, takedown, privacy fault |
| Hotfix | `internal` for the test build, `store` for the fix | a branch from the shipped tag, a narrow diff, the full matrix | delta list, green matrix, checksum | High; behaviour drift |

There are exactly three profiles, and they are named in
[workflows/foundation.md](../../workflows/foundation.md) phase 6: `dev`,
`internal` and `store` (C-051, C-142).

## Setup defaults

| Setting | Default | Source |
|---|---|---|
| Editor and packages | pinned in the manifest and the lock, copied into the build manifest | ADR-0004 |
| Tooling CLI | the latest agent tooling, with the version logged per run | ADR-0004 |
| Build profiles | `dev`, `internal` and `store`, with defines per profile | C-051, C-142 |
| Scripting backend | IL2CPP for shipping; Mono only where AOT is impossible | C-052, C-100 |
| Managed stripping | `Minimal` until a device test proves a higher level | C-146, C-147 |
| Reflection under IL2CPP | preserve each reflected type, then prove it on a device | C-147 |
| Engine code stripping | `PlayerSettings.stripEngineCode` on for an IL2CPP store build | C-150 |
| Tests | EditMode for logic, PlayMode for scene and physics, a Play Mode test marked with `[UnityTest]` (C-098) | ADR-0011, C-050, C-098 |
| Test invocation | T1 `unity test`, T0 the batchmode recipe, never both | ADR-0011 |
| Build time and size | record the minutes and the size per target, and set a size ceiling | Project default - tune against the store limit |
| Symbols | one bundle per build, kept with the artifact and the reporter | Project default - tune against the crash-reporting flow |
| Versioning | `major.minor.patch+sha.buildNumber`, from CI or the commit count | Project default - tune against the release process |
| Determinism | a fixed editor, pinned packages, no generated files in version control | ADR-0004 |
| Retention | kept for the support window, with the checksum recorded | Project default - tune against the support window |
| Store metadata | version, changelog, screenshots, age rating, privacy URL | Project default - tune against the store checklist |
| Privacy declaration | derived from the real data flows, reviewed before the submission | doctrine 01 |
| Crash reporting | opt-in, disclosed, consent-gated, with the symbols attached | doctrine 01 |
| Obfuscation | an optional post-process on the artifact, not a security control | Project default - tune against the reverse-engineering risk |

## Examples

Flag spellings move between editor versions: confirm them with
`<editor> -help` before wiring a command into CI.

CI pipeline (GitHub Actions and GameCI) (C-053):
```yaml
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Loom
        run: node tools/validate.mjs
      - name: EditMode tests
        uses: game-ci/unity-test-runner@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
        with: { projectPath: ., testMode: EditMode }
      - name: Build
        uses: game-ci/unity-builder@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
          BUILD_NUMBER: ${{ github.run_number }}
        with: { targetPlatform: StandaloneLinux64, buildMethod: BuildScript.PerformLinuxBuild }
      - uses: actions/upload-artifact@v4
        with: { name: builds-${{ github.run_number }}, path: artifacts/ }
```

Batchmode test — the T0 recipe from ADR-0011, with the command-line
arguments the test framework defines (C-144):
```bash
"$UNITY_EDITOR" -batchmode -nographics -projectPath "$PROJECT" \
  -runTests -testPlatform EditMode \
  -testResults "$ARTIFACTS/editmode-results.xml" \
  -logFile "$ARTIFACTS/editmode.log"
```

Build:
```bash
"$UNITY_EDITOR" -batchmode -nographics -quit -projectPath "$PROJECT" \
  -buildTarget StandaloneLinux64 \
  -executeMethod BuildScript.PerformLinuxBuild \
  -logFile "$ARTIFACTS/build.log"
```

Editor build script (`Assets/Editor/Build/BuildScript.cs`): `BuildProfileData`
is a project-owned helper that loads the build profile — it is not a Unity
API. The Unity calls below are checked against 6000.3.
```csharp
using UnityEditor;
using UnityEditor.Build.Reporting;

public static class BuildScript
{
    public static void PerformLinuxBuild()
    {
        var p = BuildProfileData.Load("store");
        PlayerSettings.bundleVersion = p.Version;
        var options = new BuildPlayerOptions
        {
            scenes = p.Scenes,
            locationPathName = p.OutputDir + "/Game.x86_64",
            target = BuildTarget.StandaloneLinux64,
            extraScriptingDefines = p.Defines,
        };
        var report = BuildPipeline.BuildPlayer(options);   // C-099
        if (report.summary.result != BuildResult.Succeeded)
            throw new System.Exception($"Build failed: {report.summary.result}");
    }
}
```

A programmatic build invalidates editor variables that reference GameObjects
(C-151); re-resolve them after the build.

Opt-in build guard — inactive unless the active profile turns it on. Unity 6
names the build callbacks `IPreprocessBuildWithContext` and
`IPostprocessBuildWithContext` (C-143); this project uses only those two.
```csharp
using UnityEditor.Build;
using UnityEditor.Build.Reporting;

public sealed class GuardPreprocessor : IPreprocessBuildWithContext
{
    public int callbackOrder => 0;

    public void OnPreprocessBuild(BuildContext context)
    {
        if (!BuildProfileData.Active.Guard) return;
        var offenders = CredentialScanner.Scan(context.Report.summary.platform);
        if (offenders.Count > 0)
            throw new BuildFailedException("Credential scan failed: " + string.Join(", ", offenders));
    }
}
```

Version and build number derived from git plus CI:
```bash
GIT_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo 0.0.0)"
GIT_SHA="$(git rev-parse --short=12 HEAD)"
BUILD_NUMBER="${BUILD_NUMBER:-$(git rev-list --count HEAD)}"
export VERSION="${GIT_TAG}+${GIT_SHA}.${BUILD_NUMBER}"
```

## Red lines

- No unpinned editor or package version on a release branch.
- No shipping without a green test run and archived results.
- No secrets in the repo, in the client, or in CI logs.
- No crash reporting without a disclosure and a consent path.
- No stripping level raised without a device test (C-146).
- No reflection-dependent code under IL2CPP without a preservation entry (C-147).
- No store submission without the signed compliance checklist.
- No auto-injected editor hooks or auto-running detectors.
- No mutable `latest` tag anywhere in a release pipeline.
- No unreviewed privacy or data-safety declaration.
- No `-quit` next to `-runTests`; the editor quits before the tests finish
  (C-148).
- No feature gated on `Application.internetReachability`; it reports the
  network type, not connectivity (C-149).
- No fourth build profile, and no profile outside `dev`, `internal` and
  `store`.

## Verify

- A green test run, with the results file archived beside the artifact.
- A produced artifact with a recorded SHA-256 checksum.
- A signed build that installs on a device and reaches the main menu.
- A compliance and privacy checklist signed off by a human.
- A crash-free session log from a run of the shipped build.
- The `Done when` gate of [workflows/release.md](../../workflows/release.md) passes.

## Handoff

- Frame rate, thermals, budgets -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Store rules for headsets -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Privacy of training data -> [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).
- Testable architecture -> [../loom-project/SKILL.md](../loom-project/SKILL.md).
