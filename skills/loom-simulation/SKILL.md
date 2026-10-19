---
name: loom-simulation
description: "Use for Unity simulation and training work: learning objectives, procedure state machines, deterministic assessment, xAPI and SCORM reporting, digital twins and CAD import pipelines. Apply it to any training, safety or instructional product built in Unity."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: simulation
  tier: 7
  triggers: ["simulation", "training", "procedure", "assessment", "xapi", "scorm", "digital twin", "instructional design", "lms", "instructor", "cad import", "asset transformer"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS", "xAPI 1.0.3", "SCORM 2004 4th Edition"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/", "adlnet.gov/projects/xapi"]
---

# loom-simulation — Simulation & Training

Work [workflows/simulation.md](../../workflows/simulation.md). This domain is
about *learning outcomes*, not visuals.

## When to use

- A training module teaches a fixed procedure, or a live simulation teaches
  by consequence.
- The assessment is open: a knowledge check, procedural scoring or a
  demonstrated skill.
- The delivery standard is open: xAPI, SCORM 2004, SCORM 1.2 or custom.
- A digital twin mirrors a live system, or CAD content has to be imported.
- Learner data, consent or retention has to be designed in.

## When not to use

- A question about Unity itself rather than a change -> stay in the router,
  [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- A game with no learning objective and no record ->
  [../loom-project/SKILL.md](../loom-project/SKILL.md).
- The headset rig, the comfort model or the passthrough setup ->
  [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- The interface, the menus or the audio routing of the module ->
  [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- A frame-time or memory problem in the module ->
  [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Packaging, the store or the privacy declaration ->
  [../loom-release/SKILL.md](../loom-release/SKILL.md).

## Pick the approach

| Question | Choose |
|---|---|
| What is being built | a module that teaches a fixed procedure, a live simulation that teaches by consequence, or a digital twin that mirrors a live system with no lesson |
| What is assessed | a knowledge check, procedural scoring, a demonstrated skill, or analytics only; never two at once |
| Delivery standard | xAPI for statements to a Learning Record Store (C-060); SCORM 2004 for a packaged course, SCORM 1.2 for a legacy portal; custom last |
| Step authoring | linear for a fixed sequence, a branched tree when the learner chooses, free practice when the score comes from doing |
| CAD content | import as data: units, axes, scale (C-119), decimation, LOD (C-091), then Addressables (C-007), each stage gated |
| Scoring, offline, identity | discrete events only, never rendered state (C-061); queue the statements and flush them on reconnect; the learner is an opaque LMS id |

## Setup defaults

| Area | Default | Evidence |
|---|---|---|
| Procedure model | one `ScriptableObject` per procedure, with `[Serializable]` steps that carry `SerializeReference` subclasses (C-175) | C-076, Project default - tune against the procedure set |
| Events and scoring | one table of verb and object ids across the devices, a stable id and a monotonic clock on every event, per-step weights, a critical-fail flag, the best attempt per step, a fixed-order total | Project default - tune against the scoring rubric |
| Attempt state | a versioned local record that survives a restart | Project default - tune against the attempt history |
| Identity and retention | an opaque LMS id, never a name or an email, with a retention period and a deletion path | Project default - tune against the data-protection rules |
| Offline and consent | an append-only queue that survives a restart and flushes in order, behind an explicit opt-in | Project default - tune against the offline policy |
| Delivery | an xAPI statement is a JSON record with an actor, a verb and an object (C-212); the result and the context are optional (C-155) | C-212, C-155 |
| SCORM | one package, one SCO per procedure, with the completion status the LMS records (C-211) | C-211 |
| Digital twin and authoring | every CAD and IoT feed carries units, a coordinate frame and a sample time; a unit mismatch fails the import | Project default - tune against the imported feeds |

## Examples

A step definition with a polymorphic behaviour.

```csharp
using System;
using UnityEngine;
[Serializable] public abstract class StepBehaviour
{
    public abstract void Begin(StepContext ctx);
    public abstract bool Evaluate(StepContext ctx);
}
[Serializable] public class HoldStep : StepBehaviour
{
    [SerializeField] float seconds = 2f;
    public override void Begin(StepContext ctx) => ctx.Arm(seconds);
    public override bool Evaluate(StepContext ctx) => ctx.HoldSatisfied;
}
public sealed class StepDefinition : ScriptableObject
{
    [SerializeField] string stepId;
    [SerializeField] float weight = 1f;
    [SerializeField] bool critical;
    [SerializeReference] StepBehaviour behaviour;   // C-175
}
```

A deterministic event log and scorer.

```csharp
using System.Collections.Generic;
public struct SimEvent { public string Id, StepId, Verb, ObjectId; public bool Success; public double Time; }
public sealed class EventLog
{
    readonly List<SimEvent> _events = new List<SimEvent>();
    int _next;
    public double Clock;   // monotonic session clock
    public void Record(string step, string verb, string obj, bool success) =>
        _events.Add(new SimEvent { Id = "evt-" + _next++.ToString("D5"), StepId = step, Verb = verb, ObjectId = obj, Success = success, Time = Clock });
}
public sealed class ScoringEngine
{
    readonly SortedDictionary<string, float> _best = new SortedDictionary<string, float>();
    public float Apply(string id, float weight, bool passed) { float b = _best.TryGetValue(id, out float v) ? v : 0f; if (passed && weight > b) _best[id] = weight; return Total(); }
    public float Total() { float sum = 0f; foreach (var p in _best) sum += p.Value; return sum; }   // sorted: stable total
}
```

An xAPI statement built by a serializer, and a reconnecting queue. The
serializer escapes every value, so no field is concatenated into the JSON
by hand.

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

[Serializable] public sealed class XapiStatement
{
    [Serializable] public sealed class Actor { public string objectType = "Agent"; public string name; }
    [Serializable] public sealed class Verb { public string id; }
    [Serializable] public sealed class Activity { public string id; }
    public Actor actor;
    public Verb verb;
    public Activity @object;
    public string timestamp;

    // An xAPI statement is a JSON record with an actor, a verb and an object (C-212).
    public static string Build(string actorId, string verbId, string activityId, string timestamp)
        => JsonUtility.ToJson(new XapiStatement
        {
            actor = new Actor { name = actorId },
            verb = new Verb { id = verbId },
            @object = new Activity { id = activityId },
            timestamp = timestamp,
        });
}
public interface IStatementSender { bool TrySend(string statement); }
public sealed class StatementQueue
{
    readonly string _path;
    readonly List<string> _pending = new List<string>();
    public StatementQueue(string path) { _path = path; if (File.Exists(path)) _pending.AddRange(File.ReadAllLines(path)); }
    public void Enqueue(string s) { _pending.Add(s); File.AppendAllText(_path, s + "\n"); }
    public int Flush(IStatementSender sender) { int n = 0; while (n < _pending.Count && sender.TrySend(_pending[n])) n++; if (n > 0) { _pending.RemoveRange(0, n); File.WriteAllText(_path, _pending.Count == 0 ? "" : string.Join("\n", _pending) + "\n"); } return n; }
}
```

Keep the queue file under `Application.persistentDataPath` (C-177).

A CAD import verification gate.

```csharp
using System;
using UnityEngine;
// Pipeline: units, axes, metres, decimation, LOD, then Addressables (C-007).
public static class CadGate
{
    public static bool ScaleMatches(Bounds b, double expected, double tol = 0.005) { double m = Mathf.Max(b.size.x, Mathf.Max(b.size.y, b.size.z)); return Math.Abs(m - expected) / expected <= tol; }
}
```

## Red lines

- No assessment derived from screen state; score discrete events only (C-061).
- No non-deterministic scoring: the same input always gives the same score.
- No telemetry without consent and a working opt-out.
- No learner data, name, email or credential in the client.
- No hard-coded LMS or LRS endpoint in the build; read it from configuration (C-060).
- No unscaled or unit-ambiguous CAD geometry.
- No network call that blocks the simulation loop.
- No statement assembled by concatenating raw strings; use a serializer.
- No learner data to a third party without a documented purpose and a
  retention period.
- No collection before the consent step, and no collection after the
  opt-out.

## Verify

- A test scene completes the procedure and reports the expected score.
- The same input sequence yields the same score twice, in fresh sessions.
- An emitted xAPI statement validates against a local schema copy.
- Offline mode queues the statements, survives a restart and flushes on reconnect.
- The data model, the scorer and the statement builder are covered by unit tests.
- The `Done when` gate of [workflows/simulation.md](../../workflows/simulation.md) passes.

## Handoff

- XR runtime, comfort and headset deployment -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Step-graph architecture, save and resume, data -> [../loom-project/SKILL.md](../loom-project/SKILL.md).
- Frame stability under heavy scenes -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Builds, CI, store and privacy compliance -> [../loom-release/SKILL.md](../loom-release/SKILL.md).
