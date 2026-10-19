---
name: loom-xr
description: "Unity XR for AR, VR and MR: XR Interaction Toolkit rigs, AR Foundation trackables, OpenXR setup, hand tracking, anchors, comfort, haptics."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: xr
  tier: 6
  triggers: ["xr", "virtual reality", "augmented reality", "mixed reality", "arfoundation", "xri", "openxr", "quest", "meta xr", "visionos", "polyspatial", "hand tracking", "passthrough", "spatial anchor", "plane detection", "teleport", "comfort", "haptics", "mruk", "spatial computing", "webxr", "hololens", "pico", "steamvr"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.xr.interaction.toolkit 3.x", "com.unity.xr.arfoundation 6.x", "com.unity.xr.openxr 1.x"]
  sources: ["docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit"]
---

# loom-xr — AR / VR / MR

Dialect [xr-dialect.md](../../references/xr-dialect.md), workflow [xr.md](../../workflows/xr.md), facts [claims.md](../../references/claims.md).

## Route by mode

| Mode | Stack | Verify on device |
|---|---|---|
| VR (Quest/PCVR/Pico/Vision Pro) | OpenXR + XRI 3.x + XR Hands, `XROrigin` rig (C-022) | stereo, hand select, long-session rate |
| AR (iOS/Android/headset) | AR Foundation 6.x + provider plug-in (C-024) | camera feed, tracking, anchored content |
| MR (passthrough, room-aware) | Meta OpenXR + MR Utility Kit (C-028), PolySpatial (C-030) | passthrough, world-locked at 1:1 |

## Interaction lifecycle

The five transitions, event names and resume procedure live once in
[xr-dialect.md](../../references/xr-dialect.md); gates in [xr.md](../../workflows/xr.md). Decide:

| Decision | Choose per object class |
|---|---|
| Movement type | velocity-tracking (props), kinematic (tools), instantaneous (UI) (C-122, C-080) |
| Feedback per event | hover: tint; select: tint + click + haptic; release: untint |
| Destroy cleanup | drop listeners, unregister, never destroy while selected |

Resume: on focus regain re-enable interactors, re-register with the manager,
re-read tracked devices, then select a test object and confirm feedback.

## Comfort defaults

ADR-0006 in [docs/03-decision-records.md](../../docs/03-decision-records.md) binds: the
locomotion and comfort defaults come from there, not this file. Never move the
user's head; comfort is functional (C-027).

## SETUP CHECKLIST

- **Packages** — pin the XR packages in `Packages/manifest.json`, commit the lock.
- **OpenXR features** — an Editor script sets feature groups and interaction profiles via `OpenXRSettings`, then reads them back (C-126, C-127). The hand-tracking profile class name is version sensitive.
- **AR provider plug-in** — enable the ARCore/ARKit/OpenXR loader per build target via the XR Plug-in Management API, then read it back (C-024).
- **Stereo path** — set the URP asset to single-pass instanced (C-020), read it back.
- **Graphics API** — edit `ProjectSettings/ProjectSettings.asset` `m_BuildTargetGraphicsAPIs`: Vulkan first on standalone, GLES3 fallback.
- **Textures** — ASTC mobile, BC desktop (C-043), set via `TextureImporter`.
- **Hands** — enable hand tracking in the interaction profile (C-128), drive joints with `TrackedPoseDriver`; controllers alone still work.
- **Gate** — the build boots to stereo and the log holds no XR validation error.

## PER-FRAME RULES FOR XR

- Zero allocation in the update path: no LINQ, closures, string building.
- No `Camera.main` per frame — cache the reference (C-002).
- Cache `GetComponent` results in `Awake`/`OnEnable` (C-006).
- Smooth with `Time.deltaTime`; `Time.unscaledDeltaTime` only where the timescale must not apply (C-073).
- Never `Instantiate` inside an interaction event; pool or prewarm.
- Non-alloc physics queries only (C-004).
- Frame budget: the project declares a target refresh rate; the budget is its reciprocal — 72 Hz gives about 13.9 ms, 90 Hz about 11.1 ms. Read it off the device profile.

## IDIOMATIC EXAMPLES

```csharp
// Cached components; no per-event allocation.
public sealed class Grab : MonoBehaviour
{
    [SerializeField] XRGrabInteractable it;
    [SerializeField] AudioSource sfx;
    void Awake()
    {
        it.selectEntered.AddListener(OnIn);   // C-021
        it.selectExited.AddListener(OnOut);
    }
    void OnDestroy() { /* remove both listeners first */ }
    void OnIn(SelectEnterEventArgs a) => sfx.PlayOneShot(sfx.clip);
    void OnOut(SelectExitEventArgs a) { }
}
```

```csharp
// Follow a tracked pose in LateUpdate without garbage.
public sealed class Follow : MonoBehaviour
{
    [SerializeField] Transform src, dst;
    Vector3 vel;
    void LateUpdate()
    {
        if (src == null || dst == null) return;
        dst.position = Vector3.SmoothDamp(
            dst.position, src.position, ref vel, 0.05f);
    }
}
```

```csharp
// One action serves controllers and hands.
public sealed class Echo : MonoBehaviour
{
    [SerializeField] InputActionProperty act;
    [SerializeField] AudioSource sfx;
    bool on;
    void Update()
    {
        var a = act.action;
        if (a == null || !a.enabled) return;
        bool p = a.IsPressed();
        if (p == on) return;
        on = p;
        if (on) sfx.PlayOneShot(sfx.clip);
    }
}
```

```csharp
// Frame-time guard: profiler marker plus an off-budget warning.
using Unity.Profiling;
public sealed class Guard : MonoBehaviour
{
    static readonly ProfilerMarker M = new ProfilerMarker("XR.Frame");   // C-085
    [SerializeField] float budgetMs = 11.1f;   // project value, e.g. 90 Hz
    void Update()
    {
        using (M.Auto())
        {
            float ms = Time.unscaledDeltaTime * 1000f;   // C-073
            if (ms > budgetMs)
                Debug.LogWarning($"XR frame over budget: {ms:F2} ms");
        }
    }
}
```

```csharp
// AR placement: raycast the trackable, then anchor it.
// Usings: System.Collections.Generic, Unity.XR.ARFoundation, UnityEngine.XR.
public sealed class Placer : MonoBehaviour
{
    [SerializeField] ARAnchorManager anchors;   // C-131
    [SerializeField] ARRaycastManager rays;   // trackables come from manager components (C-025)
    [SerializeField] GameObject prefab;
    [SerializeField] TrackableType types = TrackableType.PlaneWithinPolygon;
    readonly List<ARRaycastHit> hits = new();
    public void Place(Vector2 screenPoint)
    {
        hits.Clear();
        if (!rays.Raycast(screenPoint, hits, types)) return;  // confirm overload
        if (hits.Count == 0) return;
        if (!anchors.TryAddAnchor(hits[0].pose, out ARAnchor a)) return;
        Object.Instantiate(prefab, a.transform);
    }
}
```

The AR session itself is owned by `ARSession` (C-084); its `state` reports the state of the whole AR system (C-129), and `ARCameraManager` owns the camera life cycle (C-130). Placed content stays anchored (C-026).

## Red lines

- No deprecated interaction API — `selectEntered`/`selectExited` (C-021).
- No multi-pass stereo (C-020).
- No smooth locomotion as the default (ADR-0006).
- No per-frame GC in an XR hot path.
- No un-anchored AR/MR content (C-026).
- No 1:1 scale violation in MR.
- Never destroy an object while selected.
- No dead input after a pause.
- No shipping without comfort settings (ADR-0006).
- No shipping without a clean validation run.

## Handoff

- Frame time, GC, overdraw → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Training procedures, scoring → [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).
- World-space HUD → [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- Device builds, store submission → [../loom-release/SKILL.md](../loom-release/SKILL.md).
- Stereo-safe shaders → [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).

## Verify

- Rig validation is clean; the build boots to stereo.
- Frame rate holds a long session on the floor device, no GC spikes.
- All five lifecycle transitions run clean: hover, select, hold, release, destroy.
- Pause via the system menu, resume, and input still selects with feedback.
- Every comfort setting changes behaviour; the default is comfortable.
- AR/MR error states handled: permission denied, unsupported, tracking lost.
- Placed content stays anchored across movement and resume.
- `Done when` from [xr.md](../../workflows/xr.md) is satisfied.
