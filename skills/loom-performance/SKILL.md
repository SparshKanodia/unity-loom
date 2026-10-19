---
name: loom-performance
description: "Unity performance work: on-device profiling, GC allocations, draw calls and overdraw, physics and animation cost, memory and leaks, thermal budgets, frame-rate targets for mobile, PC and XR. Use when something is slow, stutters or leaks memory."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: performance
  tier: 8
  triggers: ["performance", "profiler", "optimize", "optimization", "memory", "gc allocation", "fps", "draw calls", "overdraw", "stutter", "thermal", "bottleneck", "frame debugger", "renderdoc", "memory leak"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/Profiler.html"]
---

# loom-performance — Profiling & Optimization

Run [workflows/performance.md](../../workflows/performance.md). Precedence L3: it may override a
domain default **only with measured evidence** ([doctrine/00-precedence.md](../../doctrine/00-precedence.md)).

## MEASURE BEFORE YOU FIX

No code changes until a baseline exists (ADR-0008, [doctrine/03-state-freshness.md](../../doctrine/03-state-freshness.md)):

- Device build, release configuration, representative scene, warm-up, fixed camera path, three minutes of capture.
- Record the metric **and the artefact path** (profiler capture, memory snapshot, frame-debugger session) beside each number.
- One change at a time; capture the same artefact again and compare.

Optimising by intuition is a red line: if the number did not move, it is a guess, not an optimisation.

## Which budget is broken?

| Symptom | The one measurement that proves it | Tool |
|---|---|---|
| Script-bound | CPU main-thread time in one `Update`/`LateUpdate` | Profiler timeline, `ProfilerMarker` (C-085) |
| Physics / animation-bound | `Physics.Simulate`, `FixedUpdate` and Animator time per frame | Profiler timeline, `Animator.cullingMode` (C-040) |
| UI-bound | Canvas rebuild plus UI draw calls | Profiler, frame debugger |
| GPU fill-rate | Overdraw (rendered pixels ÷ screen pixels) | RenderDoc / Xcode GPU capture (C-012) |
| Draw-call-bound | `SetPass` and draw-call counts | Frame debugger (C-010) |
| Geometry / bandwidth-bound | Triangles, batches, texture and buffer residency | Frame debugger, LODs, Memory Profiler |
| Managed heap | `GC.Alloc` per frame, GC spikes | Profiler GC column, `ProfilerRecorder` (C-086) |
| Native memory | Process RSS growth across two snapshots | Memory Profiler diff |
| Startup-bound | Time to first scene, per-load hitch | Profiler, Addressables timings (C-007) |
| Thermal-bound | Frame rate after 20+ min, battery, clocks | Device trace |

A CPU-bound frame is not fixed by fewer draw calls, a GPU-bound frame not by removing a `GetComponent` (C-006, C-010).

## BUDGET TABLE

The project defines these numbers; read them off the target device profile first.

| Budget | How the project reads it off the device |
|---|---|
| Frame time | target refresh rate ÷ 1000 → milliseconds per frame |
| Memory ceiling | OS per-app limit, minus engine and plugin reserve |
| Draw-call ceiling | frame-debugger count of the heaviest scene |
| Per-frame allocation | 0 B in steady state; repeats are bugs |
| Load time | time to first playable frame on the slowest device |
| Build size | artefact size per platform, and the store limit |

Worked example: the floor device runs at 90 Hz, so the frame budget is 1000 ÷ 90 ≈ 11.1 ms. A p95 of 12 ms misses the target even though the mean is 9 ms, so the budget reads as p95 ≤ 11.1 ms.

## IDIOMATIC EXAMPLES

```csharp
// Mark a hot path so it appears by name in the profiler.
using Unity.Profiling;
public sealed class HotPath : MonoBehaviour
{
    static readonly ProfilerMarker M = new ProfilerMarker("Game.HotPath");   // C-085
    void LateUpdate() { using (M.Auto()) { Work(); } }
    void Work() { }
}
```

```csharp
// Read a counter without the profiler UI. The name is version sensitive: confirm it (C-086).
using Unity.Profiling;
public sealed class GcWatch : MonoBehaviour
{
    ProfilerRecorder rec;
    void OnEnable() => rec = ProfilerRecorder.StartNew(
        ProfilerCategory.Memory, "GC Allocated In Frame");
    void OnDisable() => rec.Dispose();
    void Update()
    {
        if (rec.Valid && rec.LastValue > 0)
            Debug.LogWarning($"GC allocated {rec.LastValue} B this frame");
    }
}
```

```csharp
// GC.Alloc discipline: no allocation in Update — cache the lookup once, in Awake.
public sealed class CachedCamera : MonoBehaviour
{
    Camera cached;
    void Awake() => cached = Camera.main;   // C-002
    void LateUpdate() => cached.ResetWorldToCameraMatrix();
}
```

```csharp
// Pool instead of Instantiate/Destroy in a hot path.
public sealed class Pool : MonoBehaviour
{
    [SerializeField] GameObject prefab;
    readonly Stack<GameObject> free = new Stack<GameObject>();
    public GameObject Take()
    {
        if (free.Count == 0) return Instantiate(prefab);
        GameObject o = free.Pop();
        o.SetActive(true);
        return o;
    }
    public void Give(GameObject o) { o.SetActive(false); free.Push(o); }
}
```

```csharp
// Batch instead of instantiating a material per object.
public sealed class PerObjectTint : MonoBehaviour
{
    static readonly int TintId = Shader.PropertyToID("_BaseColor");   // C-183
    [SerializeField] Renderer target;
    [SerializeField] Color color = Color.white;
    MaterialPropertyBlock block;   // C-087
    void Awake() => block = new MaterialPropertyBlock();
    void LateUpdate()
    {
        target.GetPropertyBlock(block);
        block.SetColor(TintId, color);
        target.SetPropertyBlock(block);
    }
}
```

```csharp
// Addressables instead of Resources; the handle is released explicitly (C-007, C-044).
public sealed class AssetLoader : MonoBehaviour
{
    [SerializeField] AssetReferenceGameObject asset;
    IEnumerator Load()
    {
        var handle = asset.LoadAssetAsync<GameObject>();
        yield return handle;
        handle.Release();   // explicit release, not UnloadUnusedAssets
    }
}
```

```csharp
// Watchdog: track p95, not the mean, and never allocate per frame.
public sealed class FrameWatchdog : MonoBehaviour
{
    [SerializeField] float budgetMs = 11.1f;   // project value
    readonly float[] samples = new float[600];
    int count, index;
    void Update()
    {
        samples[index] = Time.unscaledDeltaTime * 1000f;   // C-073
        index = (index + 1) % samples.Length;
        if (++count < samples.Length) return;
        var sorted = (float[])samples.Clone();
        System.Array.Sort(sorted);
        float p95 = sorted[(int)(sorted.Length * 0.95f)];
        if (p95 > budgetMs)
            Debug.LogWarning($"p95 frame time {p95:F2} ms over {budgetMs:F2} ms");
    }
}
```

## Red lines

- No optimisation without a baseline and a recorded before/after.
- No measuring in the editor and shipping to a device.
- No change that alters gameplay behaviour without being flagged.
- No per-frame allocation in a hot path.
- No material instantiation in a loop (C-087).
- No `Resources.UnloadUnusedAssets` in a hot path (C-044).
- No generalising from one scene to the whole game.
- No shipping an over-budget build silently.

## Handoff

- Rendering-specific reduction → [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- XR budgets and stereo cost → [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Perf regression gates in CI → [../loom-release/SKILL.md](../loom-release/SKILL.md).
- Data or architecture causes of allocation → [../loom-project/SKILL.md](../loom-project/SKILL.md).

## Verify

- Before and after numbers exist for every change, with an artefact path each.
- p95 frame time, not only the mean, is inside the budget on the floor device.
- Memory delta measured on device across two snapshots; no growth.
- The build still passes the `Done when` gate of [performance.md](../../workflows/performance.md).
- A written statement of what was **not** improved, and why.
