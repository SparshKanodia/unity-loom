---
name: loom-performance
description: "Use for Unity performance work: on-device profiling, GC allocations, draw calls and overdraw, physics and animation cost, memory growth and leaks, thermal budgets, and frame-rate targets for mobile, PC and XR. Apply it whenever something is slow, stutters, or leaks memory."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: performance
  tier: 8
  triggers: ["performance", "profiler", "optimize", "optimization", "memory", "gc allocation", "fps", "draw calls", "overdraw", "stutter", "thermal", "bottleneck", "frame debugger", "renderdoc", "memory leak"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/Profiler.html"]
---

# loom-performance — Profiling & Optimization

Run [workflows/performance.md](../../workflows/performance.md). Precedence L1: a
measured artefact — a capture, a test run, a build log — outranks an ADR
default (L2) and a domain default (L3), and the artefact is cited
([doctrine/00-precedence.md](../../doctrine/00-precedence.md)).

## When to use

- Something is slow, stutters, or drops frames, and the cause is unknown.
- The memory grows during a session and a leak is suspected.
- A build is over budget and the release gate has to be satisfied.
- A budget has to become a guard that keeps running after the fix.
- A change has to be accepted or rejected on a measured number.

## When not to use

- The request is to author the interface or the sound, not to measure it ->
  [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- The request is to author the content, the rig or the level ->
  [../loom-2d/SKILL.md](../loom-2d/SKILL.md) or
  [../loom-3d/SKILL.md](../loom-3d/SKILL.md).
- The request is to change the look, the shaders or the tiers ->
  [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- The request is to package the build or to submit it ->
  [../loom-release/SKILL.md](../loom-release/SKILL.md).
- A question about Unity itself rather than a change -> stay in the router,
  [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- The game already meets the budget and nothing is slow -> say so and stop.

## Pick the approach

| Situation | Approach |
|---|---|
| The cause is unknown | Capture a baseline first; no code change before one exists (ADR-0008) |
| Two domains could own the cause | Use the symptom table of phase 1 in [workflows/performance.md](../../workflows/performance.md) to pick the owner |
| The number did not move | Revert the change; it was a guess, not an optimisation |
| Several changes are in flight | One change at a time, each with its own before and after |
| The capture needs a window-only tool | Emit a `HUMAN HANDOFF`, and read the counters from a script wherever the API allows it |
| The target is a device | An editor capture is never a device result |
| The metric is a frame time | Report the p95, never the mean alone |

The symptom-to-cause table, the fix order and the artefact layout have one
owner: [workflows/performance.md](../../workflows/performance.md).

## Setup defaults

| Budget | How the project reads it | Source |
|---|---|---|
| Frame time | the target refresh rate divided by one thousand, in milliseconds | `docs/perf-targets.md`, written in foundation phase 1 |
| Memory ceiling | the OS per-app limit, minus the engine and plugin reserve | `docs/perf-targets.md` |
| Draw-call ceiling | the draw-call count of the heaviest scene | `docs/perf-targets.md` |
| Per-frame allocation | zero bytes in steady state | Project default - tune against the allocation counter |
| Load time | the time to the first playable frame on the slowest device | `docs/perf-targets.md` |
| Build size | the artefact size per platform, and the store limit | `docs/perf-targets.md` |
| Soak length | the duration set in foundation phase 1 | `docs/perf-targets.md` |

Every millisecond figure in this file is written as `<budget-ms>`, because the
real value is a project measurement rather than a constant this repository
owns. The arithmetic, as an example and not as a default: a 90 Hz target
gives 1000 divided by 90, which is about 11.1 ms. A p95 of 12 ms misses that
target even when the mean is 9 ms, so the budget reads as p95 at or below
`<budget-ms>`.

## Examples

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
    static readonly int TintId = Shader.PropertyToID("_BaseColor");   // C-216
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
// A buffer of unmanaged memory, allocated and disposed on purpose (C-179).
using Unity.Collections;
public sealed class VertexBuffer : System.IDisposable
{
    NativeArray<float> _data;
    public void Open(int length) => _data = new NativeArray<float>(length, Allocator.Temp);
    public void Close() { if (_data.IsCreated) _data.Dispose(); }
    public void Dispose() => Close();
}
```

```csharp
// Frame watchdog: a ring buffer, no per-frame allocation, p95 not the mean.
public sealed class FrameWatchdog : MonoBehaviour
{
    [SerializeField] float budgetMs;             // the project value, in milliseconds
    [SerializeField] int capacity = 600;         // project default - the sample window
    [SerializeField] float logIntervalSec = 5f;  // project default - the log rate

    float[] _ring;
    float[] _scratch;
    int _head, _count;
    float _nextLogAt;

    void Awake()
    {
        _ring = new float[capacity];
        _scratch = new float[capacity];
    }

    void Update()
    {
        if (budgetMs <= 0f) return;                        // no project value set yet
        _ring[_head] = Time.unscaledDeltaTime * 1000f;      // C-073
        _head = (_head + 1) % capacity;
        if (_count < capacity) _count++;
        if (_count < capacity) return;

        for (int i = 0; i < _count; i++)                    // oldest sample first
            _scratch[i] = _ring[(_head + i) % capacity];
        System.Array.Sort(_scratch, 0, _count);            // in place, no allocation
        float p95 = _scratch[(int)(_count * 0.95f)];

        if (p95 <= budgetMs || Time.unscaledTime < _nextLogAt) return;
        _nextLogAt = Time.unscaledTime + logIntervalSec;
        Debug.LogWarning($"p95 frame time {p95:F2} ms over {budgetMs:F2} ms");
    }
}
```

## Red lines

- No optimisation without a baseline and a recorded before and after.
- No measuring in the editor and shipping to a device.
- No change that alters gameplay behaviour without being flagged.
- No per-frame allocation in a hot path.
- No material instantiation in a loop (C-087).
- No `Resources.UnloadUnusedAssets` in a hot path (C-044).
- No generalising from one scene to the whole game.
- No shipping an over-budget build silently.
- No window-only tool used as the only evidence; a handoff or a script
  counter is the evidence.
- No hard-coded frame budget in a script; the value comes from the project
  target table.

## Verify

- Before and after numbers exist for every change, with an artefact path each.
- The p95 frame time, not only the mean, is inside `<budget-ms>` on the floor device.
- The memory delta is measured on the device across two snapshots, with no growth.
- The soak runs for the duration set in foundation phase 1; twenty minutes is
  the minimum, not the target.
- The `Done when` gate of [workflows/performance.md](../../workflows/performance.md) passes.
- A written statement of what was **not** improved, and why.

```text
HUMAN HANDOFF
What:   Capture the timeline, the render counters, the GPU frame and the
        memory snapshot pair of one scenario run
Why:    The profiler, the memory profiler, RenderDoc and the frame debugger
        are window-only applications, so the agent cannot take these captures
        itself at any tier
Steps:  1) Run the scenario build for the fixed duration
        2) Record the CPU timeline and the render counters of that run
        3) Capture one GPU frame with the external capture tool
        4) Take one memory snapshot at the start and one at the end
        5) Report the p95 frame time, the GC bytes per frame, the draw calls
           and the peak resident memory
Verify: the reported numbers match the budget in the project target table,
        and the counters match the values the in-game script recorded
```

## Handoff

- Rendering-specific reduction -> [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- XR budgets and stereo cost -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Perf regression gates in CI -> [../loom-release/SKILL.md](../loom-release/SKILL.md).
- Data or architecture causes of allocation -> [../loom-project/SKILL.md](../loom-project/SKILL.md).
