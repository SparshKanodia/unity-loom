# 05 — Attribution

Unity Loom is a **synthesis**. No upstream source code, documentation text, or
asset is copied into this repository. Upstream projects are credited here and
referenced by URL only.

## How we referenced upstream work

1. **Ideas, not text.** Every upstream concept is described in our own words.
2. **No vendoring, no submodules, no generated dumps.**
3. **License honesty.** Repos whose licence is `NOASSERTION` or GPL are treated
   as read-only references and never reproduced.
4. **Traceability.**
   [references/traceability.md](../references/traceability.md) maps upstream
   contributions and issue-derived failure modes to the design element they
   motivated.

## Licence position

- **This repository is MIT** (`LICENSE`). It ships our own text only.
- **Unity-Technologies repositories are not MIT.** `skills` and
  `unity-agent-plugin` are recorded as **Unity Companion License** in
  `manifest.json`. That licence is source-available, not an OSI open-source
  licence, and it does not grant the right to redistribute upstream code, so we
  take no code, no prose and no asset from them.
- **`check upstream` is the only token for an unchecked licence.** It means
  the licence file of that row has not been read yet. It is replaced by the
  exact licence name once the row is checked. No other phrase is used for the
  same state, anywhere in this repository.
- A licence stated here is a statement about the upstream project, not about
  this repository. This repository stays MIT.

## Credited upstreams

These sixteen projects are the ones the design draws on. The order, the
licence, the idea taken and the idea rejected are identical to the `upstream`
array in `manifest.json`, so the machine registry and this document cannot
disagree. The narrative ledger, with the file each idea landed in, is
[references/upstream.md](../references/upstream.md).

| Repository | Licence | What we took (as an idea) | What we deliberately rejected |
|---|---|---|---|
| `Unity-Technologies/skills` | Unity Companion License | editor-driven workflow concept, skill granularity | vendoring |
| `jack-arturo/skillissue` | check upstream | graduated build and verify ship path | single-focus skill |
| `Unity-Technologies/unity-agent-plugin` | Unity Companion License | packaging concept | three drift-prone channels |
| `Nice-Wolf-Studio/unity-claude-skills` | MIT | correctness/architecture/design-intent tiering, XR topical coverage | GUI instructions, hook testbed |
| `Besty0728/Unity-Skills` | MIT | anti-hallucination guardrails, collider matrix, operating modes | reflection-only bridge, invasive editor hooks |
| `mflRevan/unity-control-protocol` | MIT | generated catalog, visual feedback, omni/surface split | hard CLI+bridge dependency |
| `meta-quest/agentic-tools` | Apache-2.0 | verify-first pre-flight, MR/device tooling concepts | all-or-nothing setup |
| `CoplayDev/unity-mcp` | MIT | editor bridge tool surface, issue-derived failure modes | hard Python/uv dependency |
| `JulianKerignard/Unity-Skills` | MIT | decision trees, hard rules, prototype gradient | colliding unity-* names |
| `MuharremTozan/unity-agent-skills` | check upstream | pattern library organisation | pattern sprawl |
| `alphaonedev/openclaw-graph` | check upstream | skills-as-data idea | deprecated XR API examples |
| `marcosotomac/unity-ai` | check upstream | observe-act-verify loop | control-plane coupling |
| `Unity-Technologies/arfoundation-samples` | check upstream | AR feature reference scenes, issue-derived AR triage | vendoring |
| `Unity-Technologies/XR-Interaction-Toolkit-Examples` | check upstream | interaction lifecycle and sample-issue mitigations | vendoring |
| `VRMADA/ultimatexr-unity` | MIT | issue-derived XR failure modes | framework adoption |
| `skillsdirectory.com/Claude-Dev-Suite/unity-xr` | check upstream | the XR naming landscape, read to confirm the dialect | a single-file skill scope |

The last row is a skill directory listing, not a GitHub repository. It was read
to confirm the XR naming landscape against the dialect we ship, and it is
credited on that basis alone.

## Read-only reference repositories

These seventeen projects were read as background. **They carry no design
element**: no file, no rule, no table and no default in this repository came
from them. They are listed so that a reader knows what was consulted, and so
that the ledger in [references/upstream.md](../references/upstream.md) can be
audited. Nothing in this table is a source of a shipped decision.

| Repository | Licence | Why it was read |
|---|---|---|
| `Unity-Technologies/EntityComponentSystemSamples` | check upstream | To know which DOTS scope questions were still open. |
| `Unity-Technologies/Graphics` | check upstream | To read the render pipeline scope and its own budget language. |
| `Unity-Technologies/ml-agents` | check upstream | To see how the agent-simulation domain names its scope. |
| `Unity-Technologies/InputSystem` | check upstream | To read the input action model and the rebinding surface. |
| `Unity-Technologies/UnityCsReference` | check upstream | To read the engine behaviour behind the claim registry. |
| `Unity-Technologies/NavMeshComponents` | check upstream | To see how the navigation domain scopes itself. |
| `Unity-Technologies/com.unity.multiplayer.samples.coop` | check upstream | To see how multiplayer is scoped and sampled. |
| `Unity-Technologies/Unity-Robotics-Hub` | check upstream | To see how robotics and simulation are scoped. |
| `ExtendRealityLtd/VRTK` | MIT | To read legacy interaction design, which is unmaintained. |
| `microsoft/MixedRealityToolkit-Unity` | MIT | To read legacy MR interaction design, which is unmaintained. |
| `baba-s/awesome-unity-open-source-on-github` | Unlicense | To see the category taxonomy the domain list was built from. |
| `insthync/awesome-unity3d` | Unlicense | To see the category taxonomy the domain list was built from. |
| `StefanoCecere/awesome-opensource-unity` | CC0-1.0 | To see the category taxonomy the domain list was built from. |
| `UnityCommunity/AwesomeUnityCommunity` | CC0-1.0 | To see the category taxonomy the domain list was built from. |
| `netpyoung/awesome-unity-free` | MIT | To see how a free-only filter is expressed. |
| `jeffreylanters/awesome-unity-packages` | check upstream | For OpenUPM orientation. |
| `michidk/Unity-Script-Collection` | **GPL-3.0 (repo)** | For awareness only. It is copyleft, so nothing from it is reproduced. |

## The principle behind the two tables

Referenced, never copied. An idea, a structure and an API name are not
copyrightable, so a design can be re-derived from them in our own words.
Everything else is off limits: no prose, no code, no asset, no submodule, no
fork, no generated dump, and no trademark beyond naming the project being
discussed.

## Trademarks

Unity, Meta Quest, Horizon OS, Vision Pro, ARCore, ARKit, OpenXR and other
names are trademarks of their respective owners. Unity Loom is not affiliated
with or endorsed by Unity Technologies, Meta, Apple, Google or Khronos.

## If you are an upstream maintainer

If you believe an idea is attributed incorrectly, or you would prefer not to be
referenced, open an issue and it will be corrected promptly.
