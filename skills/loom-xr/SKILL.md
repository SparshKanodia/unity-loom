---
name: loom-xr
description: "Use for Unity XR work: OpenXR setup and feature groups, XR Interaction Toolkit rigs and interactors, AR Foundation trackables and anchors, hand tracking, passthrough, comfort settings and haptics. Apply it to any AR, VR or MR target in a Unity project."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: xr
  tier: 6
  triggers: ["xr", "virtual reality", "augmented reality", "mixed reality", "arfoundation", "xri", "openxr", "quest", "meta xr", "visionos", "polyspatial", "hand tracking", "passthrough", "spatial anchor", "plane detection", "teleport", "comfort", "haptics", "mruk", "spatial computing", "webxr", "hololens", "pico", "steamvr"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.xr.interaction.toolkit 3.x", "com.unity.xr.arfoundation 6.x", "com.unity.xr.openxr 1.x"]
  sources: ["docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit"]
---

# loom-xr — AR / VR / MR

Dialect [xr-dialect.md](../../references/xr-dialect.md), workflow
[xr.md](../../workflows/xr.md), facts [claims.md](../../references/claims.md).

## When to use

- A headset or a handheld AR device is a target.
- The OpenXR loader, the feature groups or the interaction profiles are open.
- A rig, the interactors or the collider matrix must be built.
- An AR scenario needs its session, its managers, its placement and its anchors.
- A passthrough experience needs the room data and the privacy rules.
- A comfort model must be chosen and then verified with a tester.

## When not to use

- AR or MR work -> the AR track (Track B) or the MR track (Track C) of
  [../../workflows/xr.md](../../workflows/xr.md), not a separate skill.
- A flat-screen game with no headset ->
  [../../workflows/foundation.md](../../workflows/foundation.md).
- A world-space interface inside a headset ->
  [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- The render path, the post stack or the tiers ->
  [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Frame time, allocation or overdraw on the headset, or a question about
  Unity itself -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md)
  or the router, [../unity-loom/SKILL.md](../unity-loom/SKILL.md).

## Pick the approach

| Mode | Stack | Verify on device |
|---|---|---|
| VR (Quest, PCVR, Pico, Vision Pro) | OpenXR, XRI 3.x, XR Hands and an `XROrigin` rig (C-022) | stereo, hand select, a long session rate |
| AR (iOS, Android, headset) | AR Foundation 6.x and a provider plug-in (C-024) | camera feed, tracking, anchored content |
| MR (passthrough, room-aware) | Meta OpenXR and the MR Utility Kit (C-028), PolySpatial (C-030) | passthrough, world-locked at 1:1 |

The interaction lifecycle, the event names, the resume procedure, the
collider matrix and the movement-type names have one owner:
[xr-dialect.md](../../references/xr-dialect.md) (C-080, C-122). This skill
adds the decisions that are not naming:

| Decision | Choose per object class |
|---|---|
| Movement type | the hold type per object class; the dialect file owns the property name and the values |
| Feedback per event | the cue for each transition, decided once and recorded in the decision file |
| Lifecycle and resume | the five transitions and the resume steps are owned by the dialect file; this skill only names the gate |

## Setup defaults

| Setting | Default | Evidence |
|---|---|---|
| Packages | the XR packages pinned in `Packages/manifest.json`, with the lock committed | ADR-0004 |
| OpenXR features | the feature groups and the interaction profiles set per build target in XR Plug-in Management, then read back at runtime; the names come from the dialect file and are never assumed in code | C-126, C-127, C-128 |
| AR provider plug-in | the ARCore, ARKit or OpenXR loader enabled per build target, then read back | C-024 |
| Stereo path | the pipeline asset set to single-pass instanced, then read back | C-020 |
| Graphics API | `ProjectSettings/ProjectSettings.asset`, `m_BuildTargetGraphicsAPIs`: Vulkan first on standalone, GLES3 as the fallback | Project default - tune against the device driver |
| Textures | ASTC on mobile, BC on desktop | C-043 |
| Hands | the hand-tracking feature in the interaction profile, with the joints driven by `TrackedPoseDriver` | C-128 |
| Touch input | `EnhancedTouch.Touch`, which keeps track of a touch over time | C-141 |
| Comfort | the locomotion and comfort defaults of ADR-0006 in [docs/03-decision-records.md](../../docs/03-decision-records.md) | ADR-0006, C-027 |
| Frame budget | the target refresh rate from the project target table, written as `<budget-ms>`; the budget is its reciprocal | Project default - tune against the device refresh rate |

## Examples

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
// Frame-time guard: a profiler marker and an off-budget warning.
// The budget value comes from the project target table, not from a constant.
using Unity.Profiling;
public sealed class Guard : MonoBehaviour
{
    static readonly ProfilerMarker M = new ProfilerMarker("XR.Frame");   // C-085
    [SerializeField] float budgetMs;   // the project value, in milliseconds
    void Update()
    {
        if (budgetMs <= 0f) return;                      // no project value set yet
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

The AR session itself is owned by `ARSession` (C-084); its `state` reports
the state of the whole AR system (C-129), and `ARCameraManager` owns the
camera life cycle (C-130). Placed content stays anchored (C-026).

## Red lines

- No deprecated interaction API — `selectEntered` and `selectExited` (C-021).
- No multi-pass stereo (C-020).
- No smooth locomotion as the default (ADR-0006).
- No per-frame GC in an XR hot path: no LINQ, no closures, no string building.
- No `Camera.main` per frame; cache the reference (C-002).
- No `GetComponent` in a hot path; cache it in `Awake` or `OnEnable` (C-006).
- No `Instantiate` inside an interaction event; pool or prewarm.
- No allocating physics query in a hot path (C-004).
- No un-anchored AR or MR content (C-026).
- No 1:1 scale violation in MR.
- Never destroy an object while it is selected.
- No dead input after a pause.
- No shipping without the comfort settings of ADR-0006.
- No shipping without a clean validation run.
- No OpenXR feature name assumed in code; the runtime list is read back.

## Verify

- Rig validation is clean, and the build boots to stereo.
- The frame rate holds a long session on the floor device, with no GC spikes.
- Every interaction transition named in
  [xr-dialect.md](../../references/xr-dialect.md) runs clean: hover, select,
  hold, release, despawn.
- Pause via the system menu, resume, and input still selects with feedback.
- Every comfort setting changes behaviour, and the default is comfortable.
- The AR and MR error states are handled: permission denied, unsupported,
  tracking lost.
- Placed content stays anchored across movement and resume.
- The device session runs for the soak length set in the project target
  table; twenty minutes is the minimum, not the target.
- The `Done when` gate of [workflows/xr.md](../../workflows/xr.md) passes.

## Handoff

- Frame time, GC, overdraw -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Training procedures, scoring -> [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).
- World-space HUD -> [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- Device builds, store submission -> [../loom-release/SKILL.md](../loom-release/SKILL.md).
- Stereo-safe shaders -> [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
