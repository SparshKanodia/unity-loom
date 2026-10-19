# Workflow — Graphics

Owner domain: [loom-graphics](../skills/loom-graphics/SKILL.md).
Precondition: [foundation](foundation.md) is done and the pipeline is chosen.

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

## Phase 1 — Pipeline selection and asset setup

- [ ] Choose the pipeline from the defaults table; write the decision,
      the reason and the date into `docs/graphics-decision.md`.
- [ ] Create the pipeline asset from an editor script that instantiates
      the pipeline asset type and saves it under `Assets/Settings/` (C-078).
- [ ] Assign that asset in the custom render pipeline field of
      `ProjectSettings/GraphicsSettings.asset` and in every quality level
      of `ProjectSettings/QualitySettings.asset`.
- [ ] Create one quality level per platform tier; set render scale,
      anti-aliasing, shadow distance (C-184), shadow count and texture
      quality on each level.
- [ ] Implement each renderer feature as a code subclass and register it
      in the renderer asset with a serialized-object editor script.
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

| Tier | Targets | Render scale | Anti-aliasing | Shadows | Post set | Textures |
|---|---|---|---|---|---|---|
| Low | mobile, standalone XR | 0.7 - 0.9 | off or 2x | one caster | tonemap only | ASTC, small max size |
| Medium | desktop, PC VR | 1.0 | 2x or 4x | two casters | tonemap and bloom | BC7 or BC3 |
| High | desktop high-end | 1.0 | 4x or more | four casters | full stack | BC7, full mips |

## Phase 2 — Lighting and global illumination

- [ ] Classify every light as baked, real-time or mixed and record the
      choice: a static light bakes, a moving light stays real-time, and a
      static fixture lit by a mover is mixed.
- [ ] Set the bake configuration in
      `ProjectSettings/lightmapSettings.asset` and generate the lightmap
      UVs for every mesh with an editor script.
- [ ] Run the bake from the CLI through an `-executeMethod` entry point
      and keep the bake log next to the scene. Mark static geometry as
      static so it enters the bake.
- [ ] Cover the playable area with probe volume bounds and place probe
      groups wherever a mover can leave that volume.
- [ ] Set the shadow budget per tier: shadow distance, the number of
      simultaneous casters and the resolution of each. Set the ambient
      mode and intensity per tier, and place one reflection probe per
      zone with a bounded refresh mode.
- **Gate:** the reference scene lights correctly, with no visible probe
  seam, no missing shadow and no unbaked static object in the log.

## Phase 3 — Materials and shaders

- [ ] Author standard surfaces with the graph output; write a
      hand-written shader only for a GPU-heavy or unsupported effect.
- [ ] Keep every material property inside one per-material constant
      buffer in hand-written shaders, and let the graph own the rest, so
      the batcher keeps the material in one batch (C-010).
- [ ] Enable instancing on the materials that repeat in the world and
      confirm the shader supports it (C-011).
- [ ] Pass per-instance values through a material property block; a
      material instance per object breaks batching and allocates.
- [ ] Set texture import overrides per platform group: color maps in
      sRGB, normal and mask maps linear, mipmaps on, and a compression
      format that matches the target (C-043).
- [ ] Keep a shared material library; the variant count per material
      stays small. Verify a custom shader in both eyes when XR is a
      target.
- **Gate:** the reference scene reports no missing or pink material, and
  the counters of Phase 6 stay within budget.

## Phase 4 — Post-processing and sky

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

## Phase 5 — Particles and visual effects

- [ ] Set a particle budget per tier from the table below and hold the
      scene to it.
- [ ] Pool the effect prefabs; a burst must not instantiate and destroy
      objects per emission. Prewarm long-lived emitters so the first
      visible frame is not the heaviest one.
- [ ] Avoid per-frame material or property changes; use a material
      property block for colour and transform changes.
- [ ] Move an emitter to a graph-based effect only when the count exceeds
      what a CPU emitter can afford; the graph costs GPU time and needs
      its own budget line.
- [ ] Keep the effects that must read in a dim environment free of
      colour-only cues.
- **Gate:** the profiler shows zero steady-state allocation while effects
  run, and the effect pass is not the largest item in the frame.

### Effect budget per tier

| Effect class | Low | Medium | High | Rule |
|---|---|---|---|---|
| Ambient atmosphere | 1 emitter | 2 emitters | 4 emitters | scales with the world |
| One-shot burst | 24 particles | 64 particles | 128 particles | pooled, prewarmed |
| Continuous trail | off | 1 emitter | 2 emitters | costs every frame, so cap it |

## Phase 6 — Optimization and validation

- [ ] Log the render statistics of the reference scene from an editor
      script: draw calls, batches, set-pass calls, triangles and
      overdraw; store them in `docs/graphics-baseline.md`.
- [ ] Compare the numbers before and after every visual change; a change
      without a comparison is not finished.
- [ ] Review one captured frame in the frame debugger and record the
      pass list and the set-pass count.
- [ ] Strip unused shader variants in the pipeline asset and in the build
      settings (C-014). Check the overdraw view for stacked transparency
      and remove the layers that cover nothing (C-012).
- [ ] Capture the frame on the floor device, not only in the editor, and
      attach the capture to the change record. Verify that no shader
      compiles at runtime in the recorded frames.
- **Gate:** the device capture holds the target frame rate, the stripped
  build loads no missing variant, and the baseline holds the
  before-and-after numbers.

```text
HUMAN HANDOFF
What:   Open the frame debugger on the reference scene once
Why:    The frame debugger is a window-only tool with no command line
Steps:  1) Start play mode in the reference scene
        2) Open the frame debugger window
        3) Report the set-pass count and the pass names
Verify: The count is at or below the budget in the baseline file
```

## Handoff

- The frame budget is missed after a change → [performance](performance.md)
  first; a measured capture outranks any default here.
- Stereo rendering, single-pass and comfort → [xr](xr.md).
- Text, interface materials and font atlases → [ui-audio](ui-audio.md).
- Build-time variant stripping in CI → [release](release.md).

## Done when

- One pipeline is assigned in the project settings and in every quality
  level, and the decision is written down.
- A quality level exists per platform tier, and switching tiers changes
  render scale, shadows, probes and the post set.
- Lighting is baked or mixed as classified, probes cover the playable
  area, and the shadow budget holds per tier.
- Materials are shared, batcher compatible, instanced where repeated,
  and their textures are compressed per platform.
- The post stack, the sky and the effect budget are per tier.
- The baseline holds before-and-after numbers, the device capture holds
  the target frame rate, and no runtime shader compile appears in the
  log.
