---
name: loom-release
description: "Unity build, test, CI/CD and release: Build Profiles, IL2CPP and stripping, EditMode and PlayMode tests, GitHub Actions with GameCI, crash reporting, store submission and shipping security/privacy. Use when building, testing, automating or shipping a Unity project."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
metadata:
  loom: 1
  domain: release
  tier: 9
  triggers: ["build", "build profile", "ci", "cd", "gameci", "il2cpp", "test", "unit test", "playmode", "editmode", "ship", "release", "store submission", "crash reporting", "security", "privacy", "obfuscation"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/BuildSettings.html", "docs.unity3d.com/6000.3/Documentation/Manual/Testing.html", "game.ci/docs"]
---

# loom-release — Build, Test & Ship

Router role: pick the release kind, apply the defaults, then run [workflows/release.md](../../workflows/release.md). Test invocation is capability-tiered (ADR-0011).

## 1. What kind of release am I making?

1. Public distribution channel? → **store build**.
2. A named tester group only? → **internal playtest**.
3. A change to something already shipped? → **hotfix**.
4. Local iteration only? → **dev build**.

| Kind | Required pipeline | Evidence | Risk |
|---|---|---|---|
| Dev | Local build on the `dev` profile | Build log, zero errors | Low; never distributed |
| Internal playtest | CI build on `internal`, tester-group signing | Artifact, checksum, tester install | Medium; leaks without a profile gate |
| Store | CI build on `store`, IL2CPP, symbols, metadata, privacy declaration | Checksummed artifact, device install, receipt | High; rejection, takedown, privacy fault |
| Hotfix | Branch from the shipped tag, narrow diff, full matrix | Delta list, green matrix, checksum | High; behaviour drift |

## 2. Pipeline defaults

| Setting | Default | Source |
|---|---|---|
| Editor + packages | Pinned in manifest + lock, copied to the build manifest | ADR-0004 |
| Tooling CLI | Latest agent tooling, version logged per run | ADR-0004 |
| Build profiles | `dev`, `internal`, `store`, defines per profile | C-051, C-142 |
| Scripting backend | IL2CPP for shipping; Mono only where AOT is impossible | C-052, C-100 |
| Managed stripping | `Minimal` until a device test proves a higher level | C-146, C-147 |
| Reflection under IL2CPP | Preserve each reflected type, then prove on device | C-147 |
| Engine code stripping | `PlayerSettings.stripEngineCode` on for an IL2CPP store build | C-150 |
| Tests | EditMode for logic, PlayMode for scene and physics; T1 `unity test`, T0 batchmode recipe, never both | ADR-0011, C-050 |
| Build time + size | Record minutes and size per target, set a size ceiling | — |
| Symbols | Per-build bundle kept with the artifact and the reporter | — |
| Versioning | `major.minor.patch+sha.buildNumber` from CI or commit count | — |
| Determinism | Fixed editor, pinned packages, no generated files in VCS | ADR-0004 |
| Retention | Kept for the support window, checksum recorded | — |
| Store metadata | Version, changelog, screenshots, age rating, privacy URL | — |
| Privacy declaration | Derived from real data flows, reviewed before submission | doctrine 01 |
| Crash reporting | Opt-in, disclosed, consent-gated, symbols attached | doctrine 01 |
| Obfuscation | Optional post-process on the artifact, not a security control | — |

## 3. Idiomatic examples

Flag spellings move between editor versions: confirm them with `<editor> -help` before wiring a command into CI.

CI pipeline (GitHub Actions + GameCI) (C-053):
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

Batchmode test — the T0 recipe from ADR-0011, with the command-line arguments the test framework defines (C-144):
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

Editor build script (`Assets/Editor/Build/BuildScript.cs`): `BuildProfileData` is a project-owned helper that loads the build profile — it is not a Unity API. The Unity calls below are checked against 6000.3.
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

A programmatic build invalidates editor variables that reference GameObjects (C-151); re-resolve them after the build.

Opt-in build guard — inactive unless the active profile turns it on. Unity 6
names the build callbacks `IPreprocessBuildWithContext` and
`IPostprocessBuildWithContext` (C-143); the older `...WithReport` interfaces
are the pre-Unity-6 names.
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

## 4. Red lines

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

## 5. Verify

- A green test run, results file archived beside the artifact.
- A produced artifact with a recorded SHA-256 checksum.
- A signed build that installs on a device and reaches the main menu.
- A compliance and privacy checklist signed off by a human.
- A crash-free session log from a run of the shipped build.
- `Done when` from [workflows/release.md](../../workflows/release.md) is satisfied.

## 6. Handoff

- Frame rate, thermals, budgets → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Store rules for headsets → [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Privacy of training data → [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).
- Testable architecture → [../loom-project/SKILL.md](../loom-project/SKILL.md).
