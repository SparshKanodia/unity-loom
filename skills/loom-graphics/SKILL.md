---
name: loom-graphics
description: "Unity rendering work: URP or HDRP, pipeline assets, shaders and Shader Graph, HLSL, lighting and lightmaps, reflection probes, post-processing, VFX Graph, particles, batching, instancing and decals."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: graphics
  tier: 4
  triggers: ["urp", "hdrp", "render pipeline", "shader", "shader graph", "hlsl", "lighting", "lightmap", "reflection probe", "post processing", "vfx graph", "particle system", "batching", "gpu instancing", "decal", "skybox"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.render-pipelines.universal 17.x", "com.unity.shadergraph 17.x"]
  sources: ["docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0", "docs.unity3d.com/Packages/com.unity.shadergraph"]
---

# loom-graphics — Rendering & Visuals

Work [workflows/graphics.md](../../workflows/graphics.md). API facts: [references/claims.md](../../references/claims.md).

## Decide first

| Question | Default |
|---|---|
| Pipeline | URP for cross-device, HDRP only for high-end GI |
| Batching | SRP Batcher for opaque geometry sharing a material (C-010) |
| Lighting | Baked static lightmaps plus probes, few realtime casters |
| Shaders | Shader Graph first, HLSL only for hot or unsupported paths |
| Effects | Particle System first, VFX Graph at GPU scale |
| Post | One global volume per scene with per-tier overrides |

## Decision tree

- **URP or HDRP?** → URP for cross-device; HDRP only for high-end GI. Decide once, never mid-project.
- **Too many draw calls?** → SRP Batcher compatibility first (C-010), then GPU instancing for repeats (C-011).
- **Fill-rate bound?** → stacked transparency is the usual cause (C-012); cut layers, lower render scale.
- **Baked or realtime GI?** → bake static, realtime only for lights that must move, off on mobile.
- **Forward or deferred?** → URP's default forward path with a small light count; deferred only on supported renderers (C-105).
- **Shader Graph or HLSL?** → Shader Graph unless the look needs custom lighting, stencil work or a hot loop.
- **VFX Graph or legacy particles?** → Particle System for CPU-bounded bursts, VFX Graph when GPU-bound.
- **Is a custom shader needed?** → only when Shader Graph cannot express the look; keep variants bounded (C-014).

## Pipeline defaults

| Setting | Default |
|---|---|
| Pipeline asset | One URP asset per platform tier (C-078); HDRP only for high-end GI or ray tracing |
| Render scale and MSAA | 0.7–1.0 and 2× on mobile, 1.0 and 4× on desktop, MSAA off with a heavy post stack |
| Main light shadows | Soft, 2 cascades; 30–50 m at 1024 on desktop, 15–25 m at 512 on mobile, none on the low tier (C-184) |
| Additional lights | 4 per object on desktop, 1 on mobile, per-pixel off on the low tier |
| Texture compression | ASTC on mobile and Quest, BC7 on desktop (C-043) |
| Shader variants | Strip unused variants in the pipeline asset (C-014) |
| Material overrides | `MaterialPropertyBlock` per renderer, never a per-object material (C-087) |
| Baked lighting | Bake static lightmaps, one probe group per room, APV on high tiers (C-108), one reflection probe per room (C-110) |
| Post-processing | One global volume per scene, per-tier overrides, local volumes for effects |
| Decals and particles | ≤ 4 decals per camera (C-109) and ≤ 200 particles per system on mobile |
| LOD bias | 1.0 on mobile, 1.0–2.0 on desktop (higher keeps more detail) |

## Idiomatic HLSL

Keep every material property in the `UnityPerMaterial` CBUFFER so the SRP Batcher can keep the material in one batch (C-010); the macros make it instancing-ready (C-011).

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

A custom lit shader in this project also declares the `ShadowCaster` and `DepthOnly` passes.

## Idiomatic C#

```csharp
using UnityEngine;

static readonly int s_ColorId = Shader.PropertyToID("_BaseColor");   // C-183
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

One block per renderer in this project, so a block is never shared between renderers (C-087).

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
// Bound particle cost per tier; the cap lives in code, not in an inspector guess.
var ps = GetComponent<ParticleSystem>();
ps.main.maxParticles = lowTier ? 200 : 600;
ps.main.simulationSpace = ParticleSystemSimulationSpace.World;
```

ReflectionProbe: one per room or outdoor region, baked unless something in it moves (C-110).

## Red lines

- No per-object material instantiation in a loop; use `MaterialPropertyBlock` (C-087).
- No per-object `SetColor` on a shared material; use a property block instead (C-087).
- No material property outside the `UnityPerMaterial` CBUFFER; keep every material property in one constant buffer so the SRP Batcher can keep the material in one batch (C-010).
- No multi-pass shaders by default; an extra pass is an explicit cost, recorded in the change log.
- No unbounded overdraw from stacked transparency (C-012).
- No `Material` allocation per frame and no `Shader.Find` in a hot path.
- No realtime GI or realtime shadow cascades on mobile by default.
- No unbounded shader variants; strip what the project does not use (C-014).

## Verify

- The frame debugger shows the expected passes and a SetPass count in budget.
- Draw calls are recorded before and after every material or shader change.
- Overdraw is measured on the device, not estimated from the scene view.
- A device build holds the target frame rate with the final look and post stack.
- A custom shader renders identically in both eyes when XR is a target (C-020).
- `Done when` from [workflows/graphics.md](../../workflows/graphics.md) is satisfied.

## Handoff

- Cost of the visual change on device → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Stereo and XR shader compatibility → [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- UI rendering and text atlases → [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- Build-time shader stripping in CI → [../loom-release/SKILL.md](../loom-release/SKILL.md).
