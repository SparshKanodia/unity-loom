# Upstream Ledger

Unity Loom is a synthesis. No upstream prose, code, asset, or generated
artifact is copied into this repository; every upstream is credited by
name, licence, and the single idea we took from it. The full narrative
ledger is [`docs/05-attribution.md`](../docs/05-attribution.md); this file
is the working reference for the link set, the licence position, and the
review cadence.

## Licence position

- **This repository is CC0-1.0** (`LICENSE`). It ships our own text only.
- **Unity-Technologies repositories are not MIT.** `skills` and
  `unity-agent-plugin` are recorded as **Unity Companion License** in
  `manifest.json`. The Unity Companion License is a source-available
  licence, not an OSI open-source licence, and it does not grant the
  right to redistribute upstream code. We therefore take **no code, no
  prose, and no asset** from them.
- **The token `check upstream` is the only token for an unchecked licence.** It
  means the licence file of that row has not been read yet. It appears in this
  ledger, in the `upstream` array of `manifest.json` and in
  `docs/05-attribution.md`, and it is replaced by the exact licence name once
  the row is checked. No other phrase is used for the same state.
- Of the twelve Unity-Technologies repositories in the ledger, only two are in
  the `manifest.json` upstream array with this token
  (`arfoundation-samples` and `XR-Interaction-Toolkit-Examples`). The other
  eight appear in this ledger only, because they were read as reference rather
  than credited with a design element: DOTS scope guidance, render-pipeline
  scope and budgets, agent-simulation scope, input-action guidance, the API
  behaviour behind the claim registry, navigation scope, multiplayer scope and
  robotics scope.
- Repos whose licence is unknown, `NOASSERTION`, or copyleft (for
  example `michidk/Unity-Script-Collection`, GPL-3.0) are **read for
  awareness only** and never reproduced.

Consequence: ideas, structures, and API names are not copyrightable, so
we can re-derive a design from them in our own words. Everything else is
off limits. No submodule, no fork, no vendored dump, no generated
copy of an upstream file ever enters this repository.

## Ledger

One row per upstream project. `Landed in` is the file in this
repository that carries the idea. Every project is a GitHub repository,
so its canonical link is `https://github.com/<org>/<repo>` built from
the slug in the first column; a slug that cannot be verified against
the upstream file tree carries the licence token `check upstream` until
the row is checked, and it is quoted nowhere else until then.

The `Idea taken` and `Rejected` cells match the `took` and `rejected`
fields of the `upstream` array in `manifest.json`, so the manifest is a
faithful projection of this ledger. A failure or conflict id in
brackets is a pointer, not a difference.

| Project | What it is | Licence | Idea taken | Rejected, and why | Landed in |
|---|---|---|---|---|---|
| `Unity-Technologies/skills` | Unity's official agent skill set | Unity Companion License | editor-driven workflow concept, skill granularity | vendoring (F3, F12) | `doctrine/03-state-freshness.md`; `tools/validate.mjs` |
| `Unity-Technologies/unity-agent-plugin` | the same skills packaged as agent plugins | Unity Companion License | packaging concept | three drift-prone channels (F3, F12) | `manifest.json`; `README.md` |
| `Nice-Wolf-Studio/unity-claude-skills` | 35 tiered Unity skills | MIT | correctness/architecture/design-intent tiering, XR topical coverage | GUI instructions, hook testbed (F7, F15) | `skills/unity-loom/SKILL.md`; `skills/loom-xr/SKILL.md` |
| `Besty0728/Unity-Skills` | about 85 modules behind a UPM pack and a Python bridge | MIT | anti-hallucination guardrails, collider matrix, operating modes | reflection-only bridge (C11), invasive editor hooks (F9) | `references/claims.md`; `references/xr-dialect.md`; `doctrine/05-non-invasiveness.md` |
| `mflRevan/unity-control-protocol` | a CLI and bridge with a generated skill catalog | MIT | generated catalog, visual feedback, omni/surface split | hard CLI+bridge dependency (F4) | `manifest.json`; `workflows/performance.md` |
| `meta-quest/agentic-tools` | Horizon OS skills plus device tooling | Apache-2.0 | verify-first pre-flight, MR/device tooling concepts | all-or-nothing setup (F3) | `skills/unity-loom/SKILL.md`; `workflows/xr.md` |
| `CoplayDev/unity-mcp` | an MCP server and Unity package with 50+ tools | MIT | editor bridge tool surface, issue-derived failure modes | hard Python/uv dependency (F4) | `doctrine/02-capabilities.md`; `doctrine/03-state-freshness.md`; `doctrine/04-responses.md` |
| `JulianKerignard/Unity-Skills` | 18 skills built around decision trees | MIT | decision trees, hard rules, prototype gradient | colliding unity-* names (C8) | `skills/loom-project/SKILL.md`; `manifest.json` |
| `MuharremTozan/unity-agent-skills` | GoF and architecture pattern skills | check upstream | pattern library organisation | pattern sprawl (one fact, one place) | `references/anti-patterns.md` |
| `alphaonedev/openclaw-graph` | a graph-native skill store | check upstream | skills-as-data idea | deprecated XR API examples (C1) | `references/xr-dialect.md` |
| `marcosotomac/unity-ai` | an MCP and Editor control plane | check upstream | observe-act-verify loop | control-plane coupling (F4) | `doctrine/03-state-freshness.md` |
| `jack-arturo/skillissue` | a focused Quest build and verify skill | check upstream | graduated build and verify ship path | single-focus skill | `workflows/release.md` |
| `Unity-Technologies/arfoundation-samples` | AR Foundation sample scenes | check upstream | AR feature reference scenes, issue-derived AR triage | vendoring (F10) | `workflows/xr.md` |
| `Unity-Technologies/XR-Interaction-Toolkit-Examples` | XRI example scenes | check upstream | interaction lifecycle and sample-issue mitigations | vendoring (F10) | `references/xr-dialect.md` |
| `Unity-Technologies/EntityComponentSystemSamples` | DOTS sample scenes | check upstream | DOTS scope guidance only | vendoring (F10) | `docs/01-product-idea.md` (7) |
| `Unity-Technologies/Graphics` | the URP and HDRP source tree | check upstream | render pipeline scope and budgets | vendoring (F10) | `skills/loom-graphics/SKILL.md` |
| `Unity-Technologies/ml-agents` | the ML-Agents training framework | check upstream | agent simulation scope | vendoring (F10) | `skills/loom-simulation/SKILL.md` |
| `Unity-Technologies/InputSystem` | the Input System package | check upstream | input action guidance | vendoring (F10) | `skills/loom-ui-audio/SKILL.md` |
| `Unity-Technologies/UnityCsReference` | the C# reference source | check upstream | API truth behind the claim registry | vendoring (F10) | `references/claims.md` |
| `Unity-Technologies/NavMeshComponents` | the navigation package | check upstream | navigation scope | vendoring (F10) | `skills/loom-3d/SKILL.md` |
| `Unity-Technologies/com.unity.multiplayer.samples.coop` | Netcode cooperation samples | check upstream | multiplayer scope | vendoring (F10) | `skills/loom-project/SKILL.md` |
| `Unity-Technologies/Unity-Robotics-Hub` | ROS 2 bridge samples | check upstream | robotics simulation scope | vendoring (F10) | `skills/loom-simulation/SKILL.md` |
| `VRMADA/ultimatexr-unity` | a community XR framework | MIT | issue-derived XR failure modes (F13) | framework adoption | `skills/loom-xr/SKILL.md` |
| `ExtendRealityLtd/VRTK` | a legacy VR interaction framework | MIT | legacy interaction design reference | adoption (legacy, unmaintained) | `references/xr-dialect.md` |
| `microsoft/MixedRealityToolkit-Unity` | a legacy MR toolkit | MIT | MR interaction reference | adoption (legacy, unmaintained) | `workflows/xr.md` |
| `baba-s/awesome-unity-open-source-on-github` | an awesome list of Unity projects | Unlicense | category taxonomy | copying entries | `manifest.json` (domains) |
| `insthync/awesome-unity3d` | an awesome list of Unity projects | Unlicense | category taxonomy | copying entries | `manifest.json` (domains) |
| `StefanoCecere/awesome-opensource-unity` | an awesome list of Unity projects | CC0-1.0 | category taxonomy | copying entries | `manifest.json` (domains) |
| `UnityCommunity/AwesomeUnityCommunity` | a community awesome list | CC0-1.0 | category taxonomy | copying entries | `manifest.json` (domains) |
| `netpyoung/awesome-unity-free` | a list of free Unity assets | MIT | the free-only filter idea | copying entries | `doctrine/02-capabilities.md` |
| `jeffreylanters/awesome-unity-packages` | a list of Unity packages | check upstream | OpenUPM orientation | copying entries | `workflows/foundation.md` (4) |
| `michidk/Unity-Script-Collection` | a script collection | GPL-3.0 (repo) | awareness only | any copying (copyleft) | `docs/05-attribution.md` |
| `skillsdirectory.com` → Claude Dev Suite `unity-xr` | a skill directory listing one XR skill | check upstream | the XR naming landscape, read to confirm the dialect | a single-file skill scope | `references/xr-dialect.md` |

## No-vendoring rules

1. **No prose.** No paragraph, table, or sentence is copied. Every idea
   is re-described in our own words and attributed by name.
2. **No code.** No upstream source, snippet, or file is reproduced.
   Example code in this repository is written for it.
3. **No submodules, no forks, no generated dumps.** Nothing upstream is
   fetched, mirrored, or checked in as a build product.
4. **No upstream assets.** No textures, meshes, audio, or sample scenes.
5. **No trademark use beyond nominative reference.** Product names are
   used only to identify the product being discussed. Unity, Meta, Apple,
   Google, and Khronos names remain the property of their owners; Unity
   Loom is not affiliated with or endorsed by them.
6. **Attribution style.** Name the project, the licence, and what was
   taken: `Project (licence) - idea taken - where it landed`.

## Quarterly review checklist

Cadence: once per calendar quarter, in the first month after the quarter
closes. A reviewer runs the pass; the maintainer of record decides
anything the pass surfaces.

1. For each row in the ledger, open the upstream repository and read its
   releases or changelog. Note any breaking API change, licence change,
   archive, or rename.
2. For each Unity-Technologies row, confirm the licence file; replace
   "check upstream" with the exact licence name once it is known.
3. Compare each upstream default against our ADRs in
   `docs/03-decision-records.md`. If upstream moved, open a new ADR
   rather than editing a skill in place.
4. Compare the `verified-against` versions in every skill's
   `metadata.verified-against` and every row of `references/claims.md`
   with the current package versions. Update the version, or record that
   the claim still holds.
5. Re-read the issue trackers of the highest-volume upstreams for a new
   structural failure. A new cluster needs an evidence link, a
   mitigation, and a row in `references/traceability.md`.
6. Check that no upstream content has crept in: search this repository
   for copied blocks, and confirm `manifest.json` still lists every file.
7. File the findings as a note in the review log below, and open an
   issue for anything that needs a maintainer decision.

| Quarter | Reviewer | Status | Note |
|---|---|---|---|
| 2026 Q4 | reviewer | scheduled | first pass over the ledger and the claim registry |
| 2027 Q1 | reviewer | scheduled | licences for the Unity sample repos still open |
| 2027 Q2 | reviewer | scheduled | quarterly pass over the ledger and the claim registry |

Next review: the first month of 2027.

## What would require a change

| Trigger | Required action | Owner artifact |
|---|---|---|
| upstream licence changes | re-check the row, update the licence cell, re-read the no-vendoring rules | `references/upstream.md`; `docs/05-attribution.md` |
| upstream deprecates an API we cite | retire the claim, find the replacement, re-verify | `references/claims.md`; `docs/03-decision-records.md` |
| a new upstream skill repo duplicates a domain | do not add a skill; extend the existing one only if its trigger set stays disjoint | `manifest.json`; `skills/unity-loom/SKILL.md` |
| a Unity package major release | bump the `verified-against` version, re-check every claim for that package | `references/claims.md`; skill frontmatter |
| a Unity LTS change | re-pin the dialect, re-check the XR compatibility appendix, re-run the validator | `references/xr-dialect.md`; `docs/03-decision-records.md` |
| a new platform or XR runtime appears | add a route and a claim set only if a workflow and a verification path exist | `skills/loom-xr/SKILL.md`; `workflows/xr.md` |
| an upstream defaults shift against an ADR | open a new ADR; never edit the skill silently | `docs/03-decision-records.md` |
| a new failure cluster appears upstream | add F-number, mitigation, enforcing artifact, and a traceability row | `docs/04-failure-modes.md`; `references/traceability.md` |

## Primary documentation

Sources behind the claim registry; they are documentation, not upstream
projects, and no text is copied from them.

- `docs.unity3d.com/6000.3/Documentation/Manual/` and
  `docs.unity3d.com/6000.3/Documentation/ScriptReference/`
- `docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6`
- `docs.unity3d.com/Packages/com.unity.xr.arfoundation`
- `docs.unity3d.com/Packages/com.unity.xr.openxr`
- `docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0`
- `docs.unity.com/en-us/unity-cli`
- `game.ci/docs`
- `developers.meta.com/horizon/`
