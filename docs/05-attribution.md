# 05 — Attribution

Unity Loom is a **synthesis**. No upstream source code, documentation text, or asset is copied into this repository. Upstream projects are credited here and referenced by URL only.

## How we referenced upstream work

1. **Ideas, not text.** Every upstream concept is described in our own words.
2. **No vendoring, no submodules, no generated dumps.**
3. **License honesty.** Repos whose license is `NOASSERTION` or GPL are treated as read-only references and never reproduced.
4. **Traceability.** `references/traceability.md` maps upstream contributions and issue-derived failure modes to the design element they motivated.

## Ledger

| Repository | License | What we took (as an idea) | What we deliberately rejected |
|---|---|---|---|
| `Unity-Technologies/skills` | Unity Companion License | editor-driven workflow; skill granularity | vendoring; three drift-prone channels |
| `Unity-Technologies/unity-agent-plugin` | Unity Companion License | single-package distribution | manual, drifting manifests |
| `Nice-Wolf-Studio/unity-claude-skills` | MIT | correctness/architecture/design-intent tiering; XR topical coverage | GUI-click instructions; harness hook testbed |
| `Besty0728/Unity-Skills` | MIT | anti-hallucination guardrails; collider matrix; operating modes | reflection-only bridge; invasive editor hooks |
| `mflRevan/unity-control-protocol` | MIT | generated catalog; visual feedback; omni/surface split | hard CLI + bridge dependency |
| `meta-quest/agentic-tools` | Apache-2.0 | verify-first pre-flight; MR/device tooling concepts | all-or-nothing setup |
| `CoplayDev/unity-mcp` | MIT | editor bridge tool surface; issue-derived failure modes | hard Python/uv dependency |
| `JulianKerignard/Unity-Skills` | MIT | decision trees; hard rules; prototype gradient | colliding `unity-*` names |
| `MuharremTozan/unity-agent-skills` | check upstream | pattern-library organisation | pattern sprawl |
| `alphaonedev/openclaw-graph` | check upstream | skills-as-data idea | deprecated XR API examples |
| `marcosotomac/unity-ai` | check upstream | observe → act → verify loop | control-plane coupling |
| `jack-arturo/skillissue` | check upstream | focused Quest build/verify skill concept | — |
| `Unity-Technologies/arfoundation-samples` | check upstream | AR feature reference scenes; AR triage inputs | vendoring |
| `Unity-Technologies/XR-Interaction-Toolkit-Examples` | check upstream | interaction lifecycle; sample-derived mitigations | vendoring |
| `Unity-Technologies/EntityComponentSystemSamples` | check upstream | DOTS scope guidance | vendoring |
| `Unity-Technologies/Graphics` | check upstream | render-pipeline scope and budgets | vendoring |
| `Unity-Technologies/ml-agents` | check upstream | agent-simulation scope | vendoring |
| `Unity-Technologies/InputSystem` | check upstream | input-action model, rebinding, XR device layout | vendoring |
| `Unity-Technologies/UnityCsReference` | check upstream | engine API behaviour reference (read to verify, never copied) | copying source |
| `Unity-Technologies/NavMeshComponents` | check upstream | navigation scope reference | vendoring |
| `Unity-Technologies/com.unity.multiplayer.samples.coop` | check upstream | netcode scope reference | vendoring |
| `Unity-Technologies/Unity-Robotics-Hub` | check upstream | robotics and simulation scope reference | vendoring |
| `VRMADA/ultimatexr-unity` | MIT | issue-derived XR failure modes | framework adoption |
| `ExtendRealityLtd/VRTK` | MIT | legacy interaction-design reference | adoption (legacy) |
| `microsoft/MixedRealityToolkit-Unity` | MIT | MR interaction reference | adoption (legacy) |
| `baba-s/awesome-unity-open-source-on-github` | Unlicense | category taxonomy | copying entries |
| `insthync/awesome-unity3d` | Unlicense | category taxonomy | copying entries |
| `StefanoCecere/awesome-opensource-unity` | CC0-1.0 | category taxonomy | copying entries |
| `UnityCommunity/AwesomeUnityCommunity` | CC0-1.0 | category taxonomy | copying entries |
| `netpyoung/awesome-unity-free` | MIT | "free only" filter idea | copying entries |
| `jeffreylanters/awesome-unity-packages` | check upstream | OpenUPM orientation | copying entries |
| `michidk/Unity-Script-Collection` | **GPL-3.0 (repo)** | read for awareness only | **any copying** |

## Trademarks

Unity, Meta Quest, Horizon OS, Vision Pro, ARCore, ARKit, OpenXR and other names are trademarks of their respective owners. Unity Loom is not affiliated with or endorsed by Unity Technologies, Meta, Apple, Google or Khronos.

## If you are an upstream maintainer

If you believe an idea is attributed incorrectly, or you would prefer not to be referenced, open an issue and it will be corrected promptly.
