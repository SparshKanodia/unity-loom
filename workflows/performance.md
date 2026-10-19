# Workflow — Performance

Owner: [loom-performance](../skills/loom-performance/SKILL.md). This workflow turns a symptom into a measured budget; the release gate that consumes the result is [release.md](release.md). A measured artefact is precedence L1, so it outranks an ADR default (L2) and a domain default (L3).
Template: [docs/07-workflow-template.md](../docs/07-workflow-template.md).

## When to use

- Something is slow, stutters, or drops frames, and the cause is unknown.
- The memory grows during a session and the leak is suspected.
- A build is over budget and the release gate has to be satisfied.
- A budget has to be turned into a guard that keeps running after the fix.
- A change has to be accepted or rejected on a measured number, not a
  feeling.

## When not to use

- The request is to author the interface or the sound, not to measure it ->
  [ui-audio](ui-audio.md).
- The request is to author the content, the rig or the level ->
  [2d](2d.md) or [3d](3d.md).
- The request is to change the look, the shaders or the tiers ->
  [graphics](graphics.md).
- The request is to package the build or to submit it -> [release](release.md).
- A question about Unity itself rather than a change -> stay in
  [skills/unity-loom/SKILL.md](../skills/unity-loom/SKILL.md).
- The game already meets the budget and nothing is slow -> no performance
  work is needed; say so and stop.

## Before you start

- [ ] A build that reproduces the issue: same profile, same scene, same input sequence.
- [ ] A target device, or a written hardware spec when no device is available.
- [ ] A baseline capture of the current state (Phase 0 produces it if it is missing).
- [ ] The project budget: frame time, memory, build size, thermal and battery limits.

The platform frame-time table lives in [loom-performance](../skills/loom-performance/SKILL.md). Confirm the real target with the project instead of trusting a table.

The numbers this workflow compares against come from the project target table
`docs/perf-targets.md`, written in phase 1 of
[foundation](foundation.md). That file is a document of the user's project,
not of this repository. A missing one is a blocker to clear in phase 1, not a
broken link. Every millisecond figure below is written as `<budget-ms>`
because the real value is a project measurement, not a constant that this
repository may own.

## Steps

### Phase 0 — Reproduce and baseline

- [ ] Fix the scenario: one scene, one camera path, one input script, one fixed duration.
- [ ] Freeze the content: no scene or asset edits between the baseline and the next capture.
- [ ] Pick the capture that matches the suspected bottleneck: a release-build
      run whose counters are written by a script, an on-device platform
      trace, or a memory snapshot pair taken with the memory profiler
      package API.
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

Write `metrics.json` from a script so the numbers are reproducible: sample
the frame time with `Time.unscaledDeltaTime` (C-073), read the GC bytes and
the render counters with a `ProfilerRecorder` (C-086), and take the peak
memory from the second of the two snapshots. The accepted file shape is
documented in the header of `tools/perf-budget.mjs`.

On-device capture, when platform tooling is available (T3):

```bash
adb shell dumpsys gfxinfo <package> framestats > artifacts/perf/<run>/capture/gfxinfo.txt
adb logcat -d -s Unity > artifacts/perf/<run>/capture/unity.log
xcrun xctrace record --template 'Time Profiler' --device <device> --launch -- <app> --profile-duration 120s
```

Without a device, the phases below degrade to instructions: emit the exact commands and hand the capture to a human, per [doctrine/02-capabilities.md](../doctrine/02-capabilities.md). The device-tooling adapter — detection, health check, failure signatures and the idempotency rules for an install — is in [references/adapters.md](../references/adapters.md).

```text
HUMAN HANDOFF
What:   Capture the timeline and the memory snapshot pair of one scenario run
Why:    No live-editor bridge is attached at this tier, and the capture tools
        are window-only, so the agent cannot take the capture itself
Steps:  1) Run the scenario build for the fixed duration
        2) Record the CPU timeline and the render counters of that run
        3) Take one memory snapshot at the start and one at the end
        4) Report the p95 frame time, the GC bytes per frame, the draw calls
           and the peak resident memory
Verify: the reported numbers match the budget in the project target table
```

Budget template, filled in once and stored in the repository. Every value
comes from the project target table:

```yaml
budget:
  target: <device model and OS>
  frame_time_p95_ms: <budget-ms>
  gc_bytes_per_frame: <gc-bytes-per-frame>
  draw_calls: <draw-call-budget>
  peak_memory_mb: <peak-memory-mb>
  soak_minutes: <soak-minutes>
```

### Phase 1 — Classify the bottleneck

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

### Phase 2 — Fix, one change at a time

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

### Phase 3 — Verify on the device

- [ ] Run the fixed build on the target device; an Editor capture never closes this phase.
- [ ] Soak for the duration set in the project target table; twenty minutes is the floor, not the target.
- [ ] Record the device temperature and the battery or power state at the start and at the end of the soak.
- [ ] Repeat the soak with the platform power-saving mode active, if the device allows it.
- [ ] Compare the measured p95 against the store frame-rate requirement for that platform.
- [ ] Check the battery drain over the soak against the project budget.
- [ ] Without a device, state the target spec used in place of it and mark the result as unverified on hardware.
- **Gate:** the budget is met on the target device over a long session, or the budget change is written down and approved.

### Phase 4 — Guard the regression

- [ ] Choose the guard that will still run in six months: a test in the suite (C-050), a CI budget check, or a written manual check with a named owner.
- [ ] Keep the budget in a repository file next to the other release budgets, not in a chat message.
- [ ] For a CI check, fail the job when the captured p95 is above the budget.
- [ ] Copy the run's `metrics.json` to `artifacts/perf/latest/metrics.json`,
      so the guard, the CI step and the tool default read the same file.
- [ ] Wire the guard so it runs on the same schedule as the release pipeline.
- [ ] Re-run the release pipeline so the change breaks neither the build nor the size budget.
- **Gate:** a guard exists, something actually runs it, and it fails when the budget is exceeded.

The guard is the repository tool. It reads the metrics file, compares each
value with the threshold given on the command line, and exits 1 with the
metric, the value, the budget and the excess when one metric is over. The
frame-time threshold is `<budget-ms>`, the value from the project target
table; substitute it before the command runs.

```bash
node tools/perf-budget.mjs --metrics artifacts/perf/latest/metrics.json --max-p95-ms <budget-ms>
```

The same tool takes `--max-gc-bytes`, `--max-draw-calls` and
`--max-memory-mb`, and `--json` for a machine-readable report. The CI step is:

```yaml
      - name: Perf budget
        run: node tools/perf-budget.mjs --metrics artifacts/perf/latest/metrics.json --max-p95-ms <budget-ms>
```

Test guard pattern. The budget and the step length come from the project
target table, not from this file:

```csharp
[Test]
public void CombatLoop_StaysInsideTheFrameBudget()
{
    var frames = Project.PerformanceBudget.SampleFrames;
    var budgetMs = Project.PerformanceBudget.FrameTimeP95Ms;
    var stepSeconds = Project.PerformanceBudget.StepSeconds;
    var sw = System.Diagnostics.Stopwatch.StartNew();
    for (var i = 0; i < frames; i++) _combat.Tick(stepSeconds);
    sw.Stop();
    Assert.Less(sw.Elapsed.TotalMilliseconds, frames * budgetMs);
}
```

## Limitations

- The performance workflow measures one platform at a time. A budget that
  holds on the floor device says nothing about the desktop, and the target
  table has to be filled in per platform.
- It measures the frames it is given. A scenario that does not cover the
  worst case in the game reports a green result for a game that is not
  green.
- An Editor capture is never a device result, and a device result without
  a stored artefact is not a result. The workflow cannot turn a short run
  into a soak.
- The bottleneck table is a triage aid, not a measurement. It names the
  first thing to check; the capture names the real cost.
- It does not author the fix. The remedy belongs to the domain skill that
  owns the cause, and this workflow only proves whether the fix worked.
- The regression guard is only as good as the metrics file it reads. A
  metrics file that is written by hand proves nothing, and the tool cannot
  tell one from a captured one.
- It does not own the release gate. The budget becomes a build gate in
  [release.md](release.md).

### Traps

- Measuring in the Editor and reporting it as a device result.
- Comparing a mean frame time against a budget that the store states as a hard limit.
- Editing the scene between the baseline and the measurement.
- Two changes in one commit, so no before-and-after value means anything.
- Concluding from a short run on a device that throttles later.
- Declaring victory on a symptom that moved to a different scene.

## If a step fails

1. Stop at the failing gate; keep the last good artefact and the last good
   change-log row.
2. Revert the change that was measured: `git revert <sha>`, or restore the
   scene, the material or the script from the last good commit.
3. Re-run the same scenario with the same capture settings and re-read the
   metrics file, to confirm the numbers returned to the recorded state.
4. Re-read the phase gate and compare the before and after values of the
   change log.
5. If the measurement needs a device, an account, a store console or a
   person, emit a `HUMAN HANDOFF` block with What, Why, Steps and Verify,
   and stop.
6. If the same gate fails twice, write a deviation record: the gate, the
   reason, who accepted it and the date.

## Done when

- [ ] The symptom is gone on the target device; the p95 numbers and the
      archived artefacts are in the artefact directory.
- [ ] The change log lists every change with its before-and-after values and
      its artefact path.
- [ ] A regression guard exists and is wired to something that runs: the
      guard is `tools/perf-budget.mjs`, it runs on a real metrics file, and
      it has been shown to exit 1 on a file that is over budget and 0 on a
      file that is inside it.
- [ ] The release gate in [release.md](release.md) still passes; the
      release checklist records the budget as green.
