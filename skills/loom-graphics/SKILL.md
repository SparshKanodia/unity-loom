---
name: loom-graphics
description: "Use for Unity rendering work: the URP or HDRP pipeline, pipeline assets and quality tiers, shaders and Shader Graph, HLSL, lighting and lightmaps, reflection probes, post-processing, VFX Graph, particles, batching, instancing and decals. Apply it to any change in how the game looks or how it renders."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: graphics
  tier: 4
  triggers: ["urp", "hdrp", "render pipeline", "shader", "shader graph", "hlsl", "lighting", "lightmap", "reflection probe", "post processing", "vfx graph", "particle system", "batching", "gpu instancing", "decal", "skybox"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.render-pipelines.universal 17.x", "com.unity.shadergraph 17.x"]
  sources: ["docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0", "docs.unity3d.com/Packages/com.unity.shadergraph"]
---

# loom-graphics — Rendering & Visuals

Work [workflows/graphics.md](../../workflows/graphics.md). API facts:
[references/claims.md](../../references/claims.md).

## When to use

- The pipeline, the pipeline assets or the quality tiers are undecided.
- A shader is written, ported or profiled.
- Lighting, lightmaps, probes or the shadow budget need a policy.
- The post stack, the sky or the particle load must come down.
- Batching, instancing or a material change moves the draw-call count.

## When not to use

- A question about Unity itself rather than a change -> stay in the router,
  [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- Character movement, navigation or level layout ->
  [../loom-3d/SKILL.md](../loom-3d/SKILL.md).
- Sprites, atlases or a tilemap -> [../loom-2d/SKILL.md](../loom-2d/SKILL.md).
- Menus, HUD, text or audio routing ->
  [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- A frame-time or memory problem with no rendering cause ->
  [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- The same look inside a headset -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).

## Pick the approach

| Question | Default |
|---|---|
| Pipeline | URP for cross-device, HDRP only for high-end GI |
| Pipeline assets | one asset per platform tier, assigned to the matching quality level (C-078) |
| Batching | the SRP Batcher for opaque geometry that shares a material (C-010) |
| Lighting | baked static lightmaps plus probes, few realtime casters |
| Shaders | Shader Graph first, HLSL only for a hot or unsupported path |
| Effects | Particle System first, VFX Graph at GPU scale |
| Post | one global volume per scene with per-tier overrides |

Narrow it further:

- URP or HDRP? URP for cross-device; HDRP only for high-end GI. Decide once,
  never mid-project.
- Too many draw calls? The SRP Batcher compatibility first (C-010), then GPU
  instancing for the repeats (C-011).
- Fill-rate bound? Stacked transparency is the usual cause (C-012); cut the
  layers, lower the render scale.
- Baked or realtime GI? Bake the static, keep realtime for the lights that
  must move, off on mobile.
- Forward or deferred? The URP default path with a small light count;
  deferred only on the supported renderers (C-105).
- Shader Graph or HLSL? Shader Graph, unless the look needs custom lighting,
  stencil work or a hot loop.
- VFX Graph or legacy particles? Particle System for CPU-bounded bursts, VFX
  Graph when the effect is GPU-bound.
- Is a custom shader needed? Only when Shader Graph cannot express the look;
  keep the variants bounded (C-014).

## Setup defaults

| Setting | Default | Evidence |
|---|---|---|
| Pipeline asset | one URP asset per platform tier, assigned to the matching quality level | C-078, Project default - tune against the tier list |
| Pipeline asset options | the depth and opaque texture settings live on the asset | C-106 |
| Render scale and MSAA | lower on mobile, full on desktop, MSAA off with a heavy post stack | Project default - tune against the frame budget |
| Shadow type | soft | Project default - tune against the shadow cost in the capture |
| Shadow distance | 30 m to 50 m at 1024 on desktop, 15 m to 25 m at 512 on mobile, none on the low tier | C-184, Project default - tune against the shadow cost in the capture |
| Shadow cascades | two on the tiers that cast shadows | Project default - tune against the cascade count in the heaviest scene |
| Additional lights | a small count on desktop, fewer on mobile, per-pixel off on the low tier | Project default - tune against the light cost in the capture |
| Texture compression | ASTC on mobile and Quest, BC7 or BC3 on desktop | C-043 |
| Texture streaming | mipmap streaming on for the large textures, enabled per texture | C-185, C-215 |
| Shader variants | strip the unused variants in the pipeline asset | C-014 |
| Material overrides | `MaterialPropertyBlock` per renderer, never a per-object material | C-087 |
| Baked lighting | static lightmaps, one probe group per room, APV on the high tiers, one reflection probe per room | C-108, C-110 |
| Post-processing | one global volume per scene, per-tier overrides, local volumes for effects | Project default - tune against the post cost in the capture |
| Decals | placed with the `DecalProjector` component | C-109 |
| Decal count | a cap per scene, set from the capture | Project default - tune against the measured decal cost |
| Particle system | the sustained system budget: 200 particles on mobile, 600 on desktop | Project default - tune against the live particle count in the heaviest scene |
| One-shot burst | 24 particles on the low tier, 64 on the medium tier, 128 on the high tier | Project default - tune against the burst count in the heaviest effect |
| LOD bias | higher on desktop, so more detail survives | Project default - tune against the LOD switch height |

The sustained system budget and the one-shot burst are two different
numbers: the first caps a system that stays alive, the second caps an
effect that fires once. The per-tier tables live in
[workflows/graphics.md](../../workflows/graphics.md).

## Examples

Keep every material property in the `UnityPerMaterial` CBUFFER so the SRP
Batcher can keep the material in one batch (C-010); the macros make it
instancing-ready (C-011).

```hlsl
Shader "Loom/FlatLit"
{
    Properties { _BaseColor("Base", Color) = (1,1,1,1) }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass { Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_instancing
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            CBUFFER_START(UnityPerMaterial)
                half4 _BaseColor;
            CBUFFER_END
            struct Attributes { float4 positionOS : POSITION; float3 normalOS : NORMAL; UNITY_VERTEX_INPUT_INSTANCE_ID };
            struct Varyings { float4 positionCS : SV_POSITION; float3 normalWS : TEXCOORD0; UNITY_VERTEX_INPUT_INSTANCE_ID };
            Varyings Vert(Attributes IN)
            {
                Varyings OUT; UNITY_SETUP_INSTANCE_ID(IN); UNITY_TRANSFER_INSTANCE_ID(IN, OUT);
                OUT.positionCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                return OUT;
            }
            half4 Frag(Varyings IN) : SV_Target
            {
                UNITY_SETUP_INSTANCE_ID(IN);
                half ndl = saturate(dot(normalize(IN.normalWS), normalize(_MainLightPosition.xyz)));
                return half4(_BaseColor.rgb * ndl, _BaseColor.a);
            }
            ENDHLSL
        }
    }
}
```

A custom lit shader in this project also declares the `ShadowCaster` and
`DepthOnly` passes.

```csharp
using UnityEngine;

static readonly int s_ColorId = Shader.PropertyToID("_BaseColor");   // C-216
MaterialPropertyBlock _block;
Renderer _renderer;
void Awake()
{
    _block = new MaterialPropertyBlock();
    _renderer = GetComponent<Renderer>();
}
void LateUpdate()
{
    _block.Clear();
    _block.SetColor(s_ColorId, Color.Lerp(_a, _b, t));
    _renderer.SetPropertyBlock(_block);  // no material instance (C-087)
}
```

One block per renderer in this project, so a block is never shared between
renderers (C-087).

```csharp
// One realtime key light; everything else is baked.
Light CreateKeyLight(bool softShadows)
{
    var go = new GameObject("Key Light");
    var l = go.AddComponent<Light>();
    l.type = LightType.Directional;
    l.shadows = softShadows ? LightShadows.Soft : LightShadows.None;
    l.shadowStrength = 0.85f;
    return l;
}
```

```csharp
// The sustained system budget, enforced in code rather than in an inspector.
var ps = GetComponent<ParticleSystem>();
ps.main.maxParticles = lowTier ? 200 : 600;
ps.main.simulationSpace = ParticleSystemSimulationSpace.World;
```

A `ReflectionProbe` is one per room or outdoor region, baked unless
something in it moves (C-110).

## Red lines

- No per-object material instantiation in a loop; use `MaterialPropertyBlock` (C-087).
- No per-object `SetColor` on a shared material; use a property block instead (C-087).
- No material property outside the `UnityPerMaterial` CBUFFER; keep every material property in one constant buffer so the SRP Batcher can keep the material in one batch (C-010).
- No multi-pass shaders by default; an extra pass is an explicit cost, recorded in the change log.
- No unbounded overdraw from stacked transparency (C-012).
- No `Material` allocation per frame and no `Shader.Find` in a hot path.
- No realtime GI or realtime shadow cascades on mobile by default.
- No unbounded shader variants; strip what the project does not use (C-014).
- No pipeline asset without a quality level that matches its tier.

## Verify

- The capture shows the expected passes, and the SetPass count is in budget.
- Draw calls are recorded before and after every material or shader change.
- Overdraw is measured on the device, not estimated from the scene view.
- A device build holds the target frame rate with the final look and post stack.
- A custom shader renders identically in both eyes when XR is a target (C-020).
- The `Done when` gate of [workflows/graphics.md](../../workflows/graphics.md) passes.

```text
HUMAN HANDOFF
What:   Capture the render pass list and the SetPass count of the test scene
Why:    The frame debugger is a window-only tool, so the agent cannot read
        the pass list itself at any tier
Steps:  1) Open the test scene in the editor
        2) Open the frame debugger and select one rendered frame
        3) Record the pass list, the SetPass count and the draw-call count
        4) Report the three numbers next to the tier settings
Verify: the pass list matches the expected pipeline order and the SetPass
        count is at or below the number in the project target table
```

## Handoff

- Cost of the visual change on device -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Stereo and XR shader compatibility -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- UI rendering and text atlases -> [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- Build-time shader stripping in CI -> [../loom-release/SKILL.md](../loom-release/SKILL.md).
