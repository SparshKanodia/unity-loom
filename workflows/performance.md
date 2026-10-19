# Workflow — Performance

Owner: [loom-performance](../skills/loom-performance/SKILL.md). This workflow turns a symptom into a measured budget; the release gate that consumes the result is [release.md](release.md). Measured evidence outranks a domain default (precedence L3).

## Preconditions

- [ ] A build that reproduces the issue: same profile, same scene, same input sequence.
- [ ] A target device, or a written hardware spec when no device is available.
- [ ] A baseline capture of the current state (Phase 0 produces it if it is missing).
- [ ] The project budget: frame time, memory, build size, thermal and battery limits.

The platform frame-time table lives in [loom-performance](../skills/loom-performance/SKILL.md). Confirm the real target with the project instead of trusting a table.

## Phase 0 — Reproduce and baseline

- [ ] Fix the scenario: one scene, one camera path, one input script, one fixed duration.
- [ ] Freeze the content: no scene or asset edits between the baseline and the next capture.
- [ ] Pick the capture tool that matches the suspected bottleneck — CPU/GPU timeline and memory profiler in the Editor for iteration, the on-device profiler or a platform trace for the numbers that count.
- [ ] Record the artefact path, the build id, the device model, the run duration and the capture settings next to the capture.
- [ ] Record the p95 frame time, never the mean alone; add GC bytes per frame, draw calls and peak memory.
- [ ] Repeat the run twice: a run that cannot be reproduced is not a baseline.
- **Gate:** a baseline artefact exists at a known path, with p95 and the run configuration recorded.

Artefact layout to keep every run comparable:

```text
artifacts/perf/<date>-<scenario>/
  capture/        raw capture files from the profiler or the platform tool
  metrics.json    p95 frame time, GC bytes per frame, draw calls, peak memory
  device.txt      device model, OS version, temperature at start and end
  config.json     build id, scene, camera path, duration, capture settings
```

On-device capture, when platform tooling is available (T3):

```bash
adb shell dumpsys gfxinfo <package> framestats > artifacts/perf/<run>/capture/gfxinfo.txt
adb logcat -d -s Unity > artifacts/perf/<run>/capture/unity.log
xcrun xctrace record --template 'Time Profiler' --device <device> --launch -- <app> --profile-duration 120s
```

Without a device, the phases below degrade to instructions: emit the exact commands and hand the capture to a human, per [doctrine/02-capabilities.md](../doctrine/02-capabilities.md).

Budget template, filled in once and stored in the repository:

```yaml
budget:
  target: <device model and OS>
  frame_time_p95_ms: 16.6
  gc_bytes_per_frame: 0
  draw_calls: 400
  peak_memory_mb: 512
  soak_minutes: 30
```

## Phase 1 — Classify the bottleneck

| Symptom | Measurement | Likely cause | Owner skill |
|---|---|---|---|
| Frame time high, GPU busy | GPU time against CPU time in the timeline | Fill rate, overdraw (C-012), shader cost | [loom-graphics](../skills/loom-graphics/SKILL.md) |
| Frame time high, main thread busy | Main-thread marker breakdown | Per-frame allocation, searches (C-002, C-006, C-070), string work | [loom-project](../skills/loom-project/SKILL.md) |
| Frame time high, render thread busy | Render-thread markers, draw-call count | Broken batching (C-010), material variants, too many draws | [loom-graphics](../skills/loom-graphics/SKILL.md) |
| Regular GC spikes | Allocation column and GC spikes in the timeline | Allocation in update loops, LINQ, boxing, string building (C-045) | [loom-project](../skills/loom-project/SKILL.md) |
| Physics dominates | Physics module time, contact count | Layer matrix, complex colliders, sleep disabled (C-042) | [loom-3d](../skills/loom-3d/SKILL.md) |
| Animation dominates | Animation module time, culling state | Offscreen animators not culled (C-040), oversized parameter sets | [loom-3d](../skills/loom-3d/SKILL.md) |
| UI dominates | UI rebuild markers and UI draw calls | Rebuilt canvas, per-frame text (C-045), immediate-mode UI | [loom-ui-audio](../skills/loom-ui-audio/SKILL.md) |
| Memory grows during a session | Two snapshots, diffed | Leaked assets, unreleased handles (C-044), uncached instances | [loom-project](../skills/loom-project/SKILL.md) |
| Slow start | Time to first frame on a cold launch | Synchronous asset load (C-007), shader compilation, blocking IO | [loom-project](../skills/loom-project/SKILL.md) |
| Frame rate decays over time | Session trace plus device temperature | Thermal throttling, battery saver, background load | [loom-release](../skills/loom-release/SKILL.md) |
| XR-only cost | Stereo render time, motion-to-photon | Multi-pass stereo (C-020), fill rate (C-012), reprojection off | [loom-xr](../skills/loom-xr/SKILL.md) |
| Stutter on scene change | Frame-time spikes aligned with load events | Synchronous scene load, addressable unpack (C-044) | [loom-project](../skills/loom-project/SKILL.md) |

- [ ] Name one dominant cost in a sentence before touching any code.
- [ ] If two causes are plausible, capture one measurement that separates them.
- [ ] Prefer the non-alloc physics query forms in hot paths, and cache the property ids a shader needs (C-004, C-182, C-183).
- **Gate:** the dominant cost is named, and the measurement that shows it is archived.

## Phase 2 — Fix, one change at a time

- [ ] Change one thing, then re-measure the same scenario with the same capture settings.
- [ ] Keep a change log row per change with before and after values and the artefact path.
- [ ] Re-run the whole scenario after each change; a fix that moves the symptom elsewhere is not a fix.
- [ ] Revert what did not move the target metric, and keep the row marked as reverted.
- [ ] Re-measure the baseline scenario unchanged at the end, to prove the fix still holds.
- **Gate:** the targeted metric improved by a stated margin and no other metric left its budget.

Change log (copy into the performance notes and fill it in):

| # | Change | Metric | Before | After | Artefact | Verdict |
|---|---|---|---|---|---|---|
| 1 | one line describing the change | p95 frame time | value | value | path | kept or reverted |

- [ ] Fix order and the per-symptom remedies are listed in [loom-performance](../skills/loom-performance/SKILL.md); do not improvise a new order.

## Phase 3 — Verify on the device

- [ ] Run the fixed build on the target device; an Editor capture never closes this phase.
- [ ] Soak 20 to 30 minutes of the real session loop and watch for decay, not only the first minute.
- [ ] Record the device temperature and the battery or power state at the start and at the end of the soak.
- [ ] Repeat the soak with the platform power-saving mode active, if the device allows it.
- [ ] Compare the measured p95 against the store frame-rate requirement for that platform.
- [ ] Check the battery drain over the soak against the project budget.
- [ ] Without a device, state the target spec used in place of it and mark the result as unverified on hardware.
- **Gate:** the budget is met on the target device over a long session, or the budget change is written down and approved.

## Phase 4 — Guard the regression

- [ ] Choose the guard that will still run in six months: a test in the suite (C-050), a CI budget check, or a written manual check with a named owner.
- [ ] Keep the budget in a repository file next to the other release budgets, not in a chat message.
- [ ] For a CI check, fail the job when the captured p95 is above the budget.
- [ ] Wire the guard so it runs on the same schedule as the release pipeline.
- [ ] Re-run the release pipeline so the change breaks neither the build nor the size budget.
- **Gate:** a guard exists, something actually runs it, and it fails when the budget is exceeded.

CI budget check pattern:

```yaml
      - name: Perf budget
        run: node tools/perf-budget.mjs artifacts/perf/latest/metrics.json --max-p95-ms 16.6
```

Test guard pattern (a plain stopwatch assertion works without any extra package):

```csharp
[Test]
public void CombatLoop_StaysInsideTheFrameBudget()
{
    var sw = System.Diagnostics.Stopwatch.StartNew();
    for (var i = 0; i < 600; i++) _combat.Tick(0.016f);
    sw.Stop();
    Assert.Less(sw.Elapsed.TotalMilliseconds, 600 * 16.6);
}
```

## Traps

- Measuring in the Editor and reporting it as a device result.
- Comparing a mean frame time against a budget that the store states as a hard limit.
- Editing the scene between the baseline and the measurement.
- Two changes in one commit, so no before-and-after value means anything.
- Concluding from a two-minute run on a device that throttles after twenty.
- Declaring victory on a symptom that moved to a different scene.

## Handoff

- Rendering cost, batching and shader variants → [loom-graphics](../skills/loom-graphics/SKILL.md).
- Allocation caused by data flow or architecture → [loom-project](../skills/loom-project/SKILL.md).
- Interface and text cost → [loom-ui-audio](../skills/loom-ui-audio/SKILL.md).
- Stereo cost and headset budgets → [loom-xr](../skills/loom-xr/SKILL.md).
- The budget becomes a build gate → [loom-release](../skills/loom-release/SKILL.md) and [release.md](release.md).

## Done when

- The symptom is gone on the target device, the budget is met with p95 numbers and archived artefacts, the change log lists every change with its before-and-after values, a regression guard exists and is wired to something that runs, and the release gate in [release.md](release.md) still passes.
