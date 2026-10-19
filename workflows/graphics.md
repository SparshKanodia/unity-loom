# Workflow — Graphics

Owner domain: [loom-graphics](../skills/loom-graphics/SKILL.md).
Precondition: [foundation](foundation.md) is done and the pipeline is chosen.
Template: [docs/07-workflow-template.md](../docs/07-workflow-template.md).

## When to use

- The render pipeline is being chosen, or the pipeline asset is being set up.
- A quality tier per platform is missing, or the tiers do not differ enough.
- Lighting is baked wrongly, probes are missing, or shadows cost too much.
- Materials, shaders or batching need a policy and a verification pass.
- The post stack, the sky or the particle load must come down.

## When not to use

- A request about the folder tree, the assemblies or the save format ->
  [foundation](foundation.md).
- A request about sprites, tilemaps or pixel art -> [2d](2d.md).
- A request about navigation, character bodies or level kit ->
  [3d](3d.md).
- A request about menus, HUD text or the audio graph -> [ui-audio](ui-audio.md).
- A request about the comfort model, the rig or the device matrix ->
  [xr](xr.md).
- A request that the game is slow or leaks, with no look change involved ->
  [performance](performance.md).

## Before you start

- Detect the capability tier and state it; plan the fallback before the
  first asset edit
  ([doctrine/02-capabilities.md](../doctrine/02-capabilities.md)).
- At T0 every phase below is a file edit or an editor script a human runs
  once with `-executeMethod`; at T1/T2 the same scripts run from the CLI.
- One pipeline per project. Decide once, write it down, never migrate a
  project halfway.
- Version-specific statements carry a claim id from
  [references/claims.md](../references/claims.md).
- Preconditions that must hold:
  - the target platforms and the floor device are named;
  - a target frame rate and a GPU frame-time budget exist
    ([performance](performance.md));
  - the scene scale is fixed at 1 unit = 1 m ([3d](3d.md));
  - the project is under version control.

`docs/graphics-decision.md` and `docs/graphics-baseline.md` are documents of
the user's project, not of this repository. Phase 1 creates the decision file
and phase 6 creates the baseline file. One of them missing at the phase that
needs it is a blocker to clear, not a broken link.

## Steps

### Phase 1 — Pipeline selection and asset setup

- [ ] Choose the pipeline from the defaults table; write the decision,
      the reason and the date into `docs/graphics-decision.md`.
- [ ] Create one pipeline asset per platform tier from an editor script that
      instantiates the pipeline asset type and saves it under
      `Assets/Settings/` (C-078).
- [ ] Assign each tier asset to the matching quality level in
      `ProjectSettings/QualitySettings.asset`, and set the active asset in
      `ProjectSettings/GraphicsSettings.asset`.
- [ ] Create one quality level per platform tier; set render scale,
      anti-aliasing, shadow distance (C-184), shadow count and texture
      quality on each level.
- [ ] Implement each renderer feature as a code subclass and register it
      in the renderer asset with a serialized-object editor script (C-077).
- [ ] Add the pipeline packages to `Packages/manifest.json` and commit
      `Packages/packages-lock.json` with it. Check the status of the
      Built-in path before assuming it is available (C-013).
- **Gate:** a floor-device build starts, and the captured frame lists the
  pipeline's render passes instead of the Built-in ones.

### Pipeline defaults

| Question | URP | HDRP |
|---|---|---|
| Best fit | mobile, XR, one codebase for many devices | high-end desktop and console |
| Lighting | baked static plus probe coverage | real-time global illumination |
| Authoring | graph first, hand-written shaders rarely | built-in Lit plus fidelity nodes |
| Cost levers | render scale, fewer real-time lights, cheap post | fewer volumetrics, lower samples |

### Per-platform quality tiers

Project default - tune against the device capture.

| Tier | Targets | Render scale | Anti-aliasing | Shadows | Post set | Textures |
|---|---|---|---|---|---|---|
| Low | mobile, standalone XR | 0.7 - 0.9 | off or 2x | none | tonemap only | ASTC, small max size |
| Medium | desktop, PC VR | 1.0 | 2x or 4x | soft, per the shadow table | tonemap and bloom | BC7 or BC3 |
| High | desktop high-end | 1.0 | 4x or more | soft, per the shadow table | full stack | BC7, full mips |

### Shadow budget per platform

Project default - tune against the shadow cost in the device capture.

| Platform | Shadow type | Shadow distance | Shadow map |
|---|---|---|---|
| Desktop | soft, two cascades | 30 m to 50 m | 1024 |
| Mobile | soft, two cascades | 15 m to 25 m | 512 |
| Low tier | none | none | none |

The distance is the shadow distance setting (C-184), not a cascade count.

### Phase 2 — Lighting and global illumination

- [ ] Classify every light as baked, real-time or mixed and record the
      choice: a static light bakes, a moving light stays real-time, and a
      static fixture lit by a mover is mixed.
- [ ] Set the bake configuration in
      `ProjectSettings/lightmapSettings.asset` and generate the lightmap
      UVs for every mesh with an editor script (C-107).
- [ ] Run the bake from the CLI through an `-executeMethod` entry point
      and keep the bake log next to the scene. Mark static geometry as
      static so it enters the bake.
- [ ] Cover the playable area with probe volume bounds and place probe
      groups wherever a mover can leave that volume (C-108).
- [ ] Set the shadow budget per tier from the shadow table: the shadow
      distance (C-184), the number of simultaneous casters and the
      resolution of each. Set the ambient mode and intensity per tier, and
      place one reflection probe per zone with a bounded refresh mode
      (C-110).
- **Gate:** the reference scene lights correctly, with no visible probe
  seam, no missing shadow and no unbaked static object in the log.

### Phase 3 — Materials and shaders

- [ ] Author standard surfaces with the graph output; write a
      hand-written shader only for a GPU-heavy or unsupported effect.
- [ ] Keep every material property inside one per-material constant
      buffer in hand-written shaders, and let the graph own the rest, so
      the batcher keeps the material in one batch (C-010).
- [ ] Enable instancing on the materials that repeat in the world and
      confirm the shader supports it (C-011).
- [ ] Pass per-instance values through a material property block (C-087); a
      material instance per object breaks batching and allocates.
- [ ] Set texture import overrides per platform group: color maps in
      sRGB, normal and mask maps linear, mipmaps on, and a compression
      format that matches the target (C-043).
- [ ] Keep a shared material library; the variant count per material
      stays small. Verify a custom shader in both eyes when XR is a
      target.
- **Gate:** the reference scene reports no missing or pink material, and
  the counters of Phase 6 stay within budget.

### Phase 4 — Post-processing and sky

- [ ] Create one profile asset per quality tier and one global volume
      that references the tier profile.
- [ ] Add camera-level volumes only for local effects; a scene-wide
      effect belongs in the global volume. Fix the effect order in the
      profile and record it in `docs/graphics-decision.md`.
- [ ] Keep the skybox material as a cubemap and expose the tint and the
      intensity per tier.
- [ ] Trim the stack on mobile and standalone XR; a full-screen effect
      set is the most common fill-rate failure (C-012). Enable
      post-processing per camera only where it is needed.
- **Gate:** the frame time with the full stack and with the tier stack is
  recorded, and the tier stack fits the performance budget.

### Phase 5 — Particles and visual effects

- [ ] Set the sustained system budget per tier from the table below and
      hold every live system to it.
- [ ] Pool the effect prefabs; a burst must not instantiate and destroy
      objects per emission. Prewarm long-lived emitters so the first
      visible frame is not the heaviest one.
- [ ] Avoid per-frame material or property changes; use a material
      property block for colour and transform changes (C-087).
- [ ] Move an emitter to a graph-based effect only when the count exceeds
      what a CPU emitter can afford; the graph costs GPU time and needs
      its own budget line.
- [ ] Keep the effects that must read in a dim environment free of
      colour-only cues.
- **Gate:** the profiler shows zero steady-state allocation while effects
  run, and the effect pass is not the largest item in the frame.

### Effect budget per tier

Project default - tune against the particle pass cost in the capture.

| Effect class | Low | Medium | High | Rule |
|---|---|---|---|---|
| Ambient atmosphere | 1 emitter | 2 emitters | 4 emitters | scales with the world |
| Sustained system budget | 200 particles | 600 particles | 600 particles | the ceiling of one live system |
| One-shot burst | 24 particles | 64 particles | 128 particles | pooled, prewarmed |
| Continuous trail | off | 1 emitter | 2 emitters | costs every frame, so cap it |

The sustained budget is the ceiling for a system that keeps running. The
one-shot burst is the size of a single emission. They are different numbers
and they are measured separately.

### Phase 6 — Optimization and validation

- [ ] Log the render statistics of the reference scene from an editor
      script: draw calls, batches, set-pass calls, triangles and
      overdraw; store them in `docs/graphics-baseline.md`.
- [ ] Compare the numbers before and after every visual change; a change
      without a comparison is not finished.
- [ ] Read the set-pass count and the pass list from the same counters
      script, and record them beside the baseline.
- [ ] Strip unused shader variants in the pipeline asset and in the build
      settings (C-014). Check the overdraw value for stacked transparency
      and remove the layers that cover nothing (C-012).
- [ ] Capture the frame on the floor device, not only in the editor, and
      attach the capture to the change record. Verify that no shader
      compiles at runtime in the recorded frames.

```text
HUMAN HANDOFF
What:   Read the render pass list of one reference-scene frame
Why:    The pass list is only visible in the frame debugger, which is a
        window-only tool with no command line
Steps:  1) Start play mode in the reference scene
        2) Open the frame debugger window
        3) Report the set-pass count and the pass names
Verify: The count is at or below the budget in the baseline file
```

- **Gate:** the counters script writes the pass list and the set-pass count
  into the baseline file, the device capture holds the target frame rate,
  the stripped build loads no missing variant, and the baseline holds the
  before-and-after numbers.

## Limitations

- The graphics workflow does not own the scene structure, the level kit or
  the character bodies; [3d](3d.md) owns those.
- It does not cover the interface, the font atlases or the world-space
  materials; [ui-audio](ui-audio.md) owns the interface side.
- It does not author the art. It measures the cost of the art and reports
  it; the art direction is a human decision.
- The tier table and the effect budgets are project defaults, not engine
  limits. A project with a different floor device overrides them and
  records the override in the decision file.
- The counters are read from one reference scene at one moment. A scene
  that batches well hides a scene that does not, so the check repeats per
  scene and the baseline file grows with it.
- A bake is only valid for the layout it was made from. The workflow cannot
  detect a later edit that invalidated it; the bake log is the only proof.
- It does not measure the colour grade, the tone mapping or the perceived
  image quality. It measures counts, and it cannot tell a good look from a
  cheap one.

## If a step fails

1. Stop at the failing gate; keep the last good baseline file.
2. Revert the change that broke it: `git revert <sha>` for a commit, or
   restore the material, the volume or the pipeline asset from the last
   good commit.
3. Re-run the counters script and the bake, then re-read the baseline file
   to confirm the numbers are back to the recorded state.
4. Re-read the phase gate and compare the new counters with the baseline
   before and after the revert.
5. If the frame list can only be read in the frame debugger, emit a
   `HUMAN HANDOFF` block with What, Why, Steps and Verify, and stop.
6. If the same gate fails twice, write a deviation record: the gate, the
   reason, who accepted it and the date.

## Done when

- [ ] One pipeline is assigned in the project settings and in every quality
      level, and the decision is written down; the read-back of the pipeline
      asset per quality level matches.
- [ ] A quality level exists per platform tier, and switching tiers changes
      render scale, shadows, probes and the post set; the tier settings read
      back with the change.
- [ ] Lighting is baked or mixed as classified, probes cover the playable
      area, and the shadow budget holds per tier; the bake log holds no
      missing-data line.
- [ ] Materials are shared, batcher compatible, instanced where repeated,
      and their textures are compressed per platform; the counters script
      reports the draw-call count.
- [ ] The post stack, the sky and the effect budget are per tier; the tier
      profile and the budget table are in the repository.
- [ ] The baseline holds before-and-after numbers, the device capture holds
      the target frame rate, and no runtime shader compile appears in the
      log.
