---
name: loom-simulation
description: "Unity simulation and training: objectives, procedure state machines, deterministic assessment, xAPI and SCORM reporting, digital twins and CAD pipelines. Use for training and safety."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: simulation
  tier: 7
  triggers: ["simulation", "training", "procedure", "assessment", "xapi", "scorm", "digital twin", "instructional design", "lms", "instructor", "cad import", "asset transformer"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS", "xAPI 1.0.3", "SCORM 2004 4th Edition"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/", "adlnet.gov/projects/xapi"]
---

# loom-simulation — Simulation & Training

Work [workflows/simulation.md](../../workflows/simulation.md). This domain is about *learning outcomes*, not visuals.

## Decision tree

- **What are you building?** → a module teaches a fixed procedure; a live simulation teaches by consequence; a digital twin mirrors a live system, no lesson.
- **What is assessed?** → a knowledge check, procedural scoring, a demonstrated skill, or analytics only — never both.
- **Delivery standard?** → xAPI (statements to a Learning Record Store, C-060); SCORM 2004 for a packaged course; SCORM 1.2 for legacy portals; custom last.
- **Step authoring?** → linear for a fixed sequence, a branched tree when the learner chooses, free practice when the score comes from doing.
- **CAD content?** → import as data: units → axes → scale (C-119) → decimate → LOD (C-091) → Addressables (C-007), each stage gated.
- **Scoring, offline, identity?** → discrete events only, never rendered state (C-061); queue statements and flush on reconnect; the learner is an opaque LMS id.

## Setup defaults

| Area | Default |
|---|---|
| Procedure model | one `ScriptableObject` per procedure (C-076); steps are `[Serializable]` types with `SerializeReference` subclasses (C-175), with success, failure, resume |
| Events and scoring | one table of verb and object ids across devices; every event carries a stable id and a monotonic clock; per-step weights, a critical-fail flag, the best attempt per step, a fixed-order total; attempt state persists in a versioned local record |
| Identity and retention | an opaque LMS id, never a name or email; a retention period and a deletion path |
| Offline and consent | an append-only queue that survives a restart and flushes in order, behind an explicit opt-in |
| Delivery | xAPI actor = learner id, verb = event verb, object = step id (C-104); SCORM: one package, one SCO per procedure, `success` from the score |
| Digital twin and authoring | every CAD and IoT feed carries units, coordinate frame and sample time; a unit mismatch fails the import; instructors edit data, analytics aggregate server-side |

## Idiomatic examples

### A step definition with a polymorphic behaviour

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

### A deterministic event log and scorer

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

### An xAPI builder and a reconnecting queue

```csharp
using System.Collections.Generic;
using System.IO;
public static class XapiStatement
{
    public static string Build(string actorId, string verbId, string activityId, string timestamp)
    {
        // actor, verb and object are the required parts of a statement (C-104)
        return "{\"actor\":{\"objectType\":\"Agent\",\"name\":\"" + actorId + "\"},"
             + "\"verb\":{\"id\":\"" + verbId + "\"},\"object\":{\"id\":\"" + activityId + "\"},"
             + "\"timestamp\":\"" + timestamp + "\"}";
    }
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

Escape interpolated values; use a JSON serializer. The result and the context of a statement are optional (C-155). Keep the queue file under `Application.persistentDataPath` (C-177).

### A CAD import verification gate

```csharp
using System;
using UnityEngine;
// Pipeline: units → axes → metres, Y-up → scale → decimate → LOD → Addressables.
public static class CadGate
{
    public static bool ScaleMatches(Bounds b, double expected, double tol = 0.005) { double m = Mathf.Max(b.size.x, Mathf.Max(b.size.y, b.size.z)); return Math.Abs(m - expected) / expected <= tol; }
}
```

## Privacy and security

- Learner telemetry, performance data, MR sensor data and instructor authoring data are personal data: consent, minimisation, retention and deletion apply ([doctrine/01-safety.md](../../doctrine/01-safety.md)).
- No credentials in the client: a statement carries an opaque learner id, never a secret or an email.
- No learner data to a third party without a documented purpose and retention period.
- Collect consent in-product with a working opt-out before the first statement leaves.

## Red lines

- No assessment derived from screen state; score discrete events only (C-061).
- No non-deterministic scoring: the same input always gives the same score.
- No telemetry without consent and a working opt-out.
- No learner data, name, email or credential in the client.
- No hard-coded LMS or LRS endpoint in the build; read it from configuration (C-060).
- No unscaled or unit-ambiguous CAD geometry.
- No network call that blocks the simulation loop.

## Verify

- A test scene completes the procedure and reports the expected score.
- The same input sequence yields the same score twice, in fresh sessions.
- An emitted xAPI statement validates against a local schema copy.
- Offline mode queues statements, survives a restart and flushes on reconnect.
- The data model, scorer and statement builder are covered by unit tests.

## Handoff

- XR runtime, comfort and headset deployment → [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Step-graph architecture, save and resume, data → [../loom-project/SKILL.md](../loom-project/SKILL.md).
- Frame stability under heavy scenes → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Builds, CI, store and privacy compliance → [../loom-release/SKILL.md](../loom-release/SKILL.md).
