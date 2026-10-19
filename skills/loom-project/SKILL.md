---
name: loom-project
description: "Use for the Unity project foundation: folder and assembly layout, version control, package pinning, ScriptableObject data, versioned save systems, dependency injection, event channels, state machines, netcode and Addressables. Apply it to project setup, architecture decisions, structural refactors, multiplayer scaffolding and persistence."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: project
  tier: 1
  triggers: ["architecture", "asmdef", "assembly definition", "scriptableobject", "save system", "dependency injection", "service locator", "event bus", "state machine", "fsm", "netcode", "multiplayer", "project setup", "folder structure", "version control", "git", "upm package", "package manager", "scene management", "addressables"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/", "docs.unity3d.com/Packages/com.unity.netcode.gameobjects", "docs.unity3d.com/Packages/com.unity.addressables"]
---

# loom-project — Foundation & Architecture

Owns the project layout and how the systems talk. Run
[workflows/foundation.md](../../workflows/foundation.md) in order; this file
picks the pattern. API facts: [references/claims.md](../../references/claims.md).

## When to use

- A new project needs its folders, assemblies and package set decided.
- A project needs version control, LFS and `ProjectSettings` discipline.
- A feature needs a data shape: authored config, save file, event channel or
  a state machine.
- Two systems must talk and neither of them owns the other.
- Runtime-loaded assets or networked state need a decision before code.

## When not to use

- Gameplay code in a project that is already set up -> the domain skill of
  the feature: [../loom-2d/SKILL.md](../loom-2d/SKILL.md) or
  [../loom-3d/SKILL.md](../loom-3d/SKILL.md).
- A question about Unity itself rather than a change to a project -> stay in
  the router, [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- The render pipeline, the look or the quality tiers ->
  [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Something slow, stuttering or leaking ->
  [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Packaging, the store or a build profile ->
  [../loom-release/SKILL.md](../loom-release/SKILL.md).

## Pick the approach

| Need | Pattern | Default | Authority |
|---|---|---|---|
| Wiring services | Composition | plain C# objects, refs serialized, built by one root | ADR-0002 |
| Two systems, no owner | Event channel | ScriptableObject channel asset | ADR-0002 |
| Many unrelated fans | Thin bus | one typed bus, explicit lifetime | ADR-0002 |
| Designer-authored data | ScriptableObject asset | read-only at runtime | C-076 |
| Service before any ref exists | Service locator | static registry, not mutable state | ADR-0002 |
| Modes of behaviour | State machine | enum plus strategy, class FSM when it grows | [foundation](../../workflows/foundation.md) |
| Multiplayer | Networked state | NGO `NetworkBehaviour`, minimal sync | C-101, C-210 |
| Any I/O | Async | `Awaitable` plus `CancellationToken` | ADR-0003, C-005 |
| Runtime assets | Addressables | load and release explicitly | ADR-0001, C-007 |

When two rows fit the same request, take the first one that applies:

- Same feature -> keep the direct reference; a channel or a bus is a cost.
- Across features with no owner -> an event channel asset.
- Fan-out to unrelated listeners -> a bus, and count the listeners.
- Numbers a designer tunes -> a ScriptableObject asset.
- Progress that survives a restart -> a versioned payload with one writer.
- Modes with entry and exit rules -> an explicit state machine.
- Networked -> settle the transport and the role before the gameplay code.
- A save file -> `Application.persistentDataPath` (C-177).
- A networked object -> spawned by the network system before it exists on a
  client (C-152).

## Setup defaults

The folder tree, the assembly list and the reference direction have one
owner: phase 3 of [workflows/foundation.md](../../workflows/foundation.md).
This skill adds the rule that the tree exists to serve — one assembly
definition per folder, references that point one way, and no path from a
runtime assembly to an editor or test assembly.

| Concern | Default | Evidence |
|---|---|---|
| Layout | the tree and the assembly list of foundation phase 3 | [workflows/foundation.md](../../workflows/foundation.md) |
| Assemblies | one assembly definition per folder, explicit reference list | Project default - tune against the compile log |
| Cycles | none; runtime never references editor or tests | Project default - tune against the dependency check |
| Serialization | private `[SerializeField]`; `[SerializeReference]` for polymorphic data | C-175 |
| Bootstrap | one `RuntimeInitializeOnLoadMethod` entry point | C-178 |
| Editor-only helpers | `HideFlags`, so they are never saved with the scene | C-176 |
| Events | channel assets before any bus | ADR-0002 |
| Authored data | `[CreateAssetMenu]` assets, never mutated at runtime | C-076 |
| Save format | a `schema` int plus one migration step per version | Project default - tune against the save format version |
| Save location | under `Application.persistentDataPath` | C-177 |
| Async | `Awaitable` with a `CancellationToken`; a delay takes a token | ADR-0003, C-005, C-171 |
| Hand-driven awaits | `AwaitableCompletionSource` | C-172 |
| Runtime assets | Addressables, loaded and released explicitly | ADR-0001, C-007 |
| Netcode role | host and client read from `NetworkManager` | C-154 |
| Networked object | a `NetworkBehaviour` component on the networked object | C-210 |
| Client calls | a method marked with `ClientRpcAttribute` | C-153 |
| Secrets | no secret in `PlayerPrefs`; it is stored unencrypted | C-102 |

## Examples

ScriptableObject config — authored, then read, never written at runtime.
```csharp
[CreateAssetMenu(fileName = "PlayerConfig", menuName = "Game/Player Config")]
public sealed class PlayerConfig : ScriptableObject
{
    [SerializeField] private float m_MoveSpeed = 6f;
    [SerializeField] private int m_MaxHealth = 100;

    public float MoveSpeed => m_MoveSpeed;
    public int MaxHealth => m_MaxHealth;
}
```

Event channel — a typed asset instead of a global bus. Subscribe in
`OnEnable`, unsubscribe in `OnDisable`.
```csharp
[CreateAssetMenu(fileName = "IntChannel", menuName = "Game/Channels/Int")]
public sealed class IntChannel : ScriptableObject
{
    public event System.Action<int> Raised;

    public void Raise(int value) => Raised?.Invoke(value);
}
```

Versioned save payload — every version gets exactly one migration step.
```csharp
[System.Serializable]
public sealed class SaveData
{
    public const int CurrentSchema = 3;
    public int schema = CurrentSchema;
    public int coins;
    public System.Collections.Generic.List<string> unlocked = new();

    public static SaveData Migrate(SaveData d)
    {
        while (d.schema < CurrentSchema)
        {
            switch (d.schema)
            {
                case 1: d.coins *= 10; d.schema = 2; break;  // v1 stored cents
                case 2: d.unlocked.Clear(); d.schema = 3; break;
                default: d.schema = CurrentSchema; break;
            }
        }
        return d;
    }
}
```

Addressables load — the wait is cancelled when the owner dies, and the
handle is released exactly once.
```csharp
public sealed class AddressableLoader : MonoBehaviour
{
    [SerializeField] AssetReferenceGameObject asset;
    CancellationTokenSource _cts;
    AsyncOperationHandle<GameObject> _handle;
    bool _held;

    public async Awaitable<GameObject> LoadAsync()
    {
        _cts = new CancellationTokenSource();
        var handle = asset.LoadAssetAsync<GameObject>();
        try
        {
            while (!handle.IsDone)
                await Awaitable.NextFrameAsync(_cts.Token);   // ADR-0003, C-072
            if (handle.Status != AsyncOperationStatus.Succeeded)
                throw new System.InvalidOperationException("load failed");
            _handle = handle;
            _held = true;                                    // released in OnDestroy
            return handle.Result;
        }
        catch (System.OperationCanceledException)
        {
            Addressables.Release(handle);                    // never handed out
            throw;
        }
    }

    void OnDestroy()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        if (_held && _handle.IsValid())
        {
            Addressables.Release(_handle);                   // released exactly once
            _held = false;
        }
    }
}
```

A cancellable delay, and a hand-completed await.
```csharp
await Awaitable.WaitForSecondsAsync(0.5f, token);   // C-171
```

Area check without per-call allocation (C-004).
```csharp
private readonly Collider[] m_Hits = new Collider[16];   // project default - the contact count

public int CountHits(Vector3 center, float radius)
{
    return Physics.OverlapSphereNonAlloc(center, radius, m_Hits, m_Layer,
        QueryTriggerInteraction.Collide);
}
```

Assembly definition — one per folder, references by name, no cycles. The
names of the six assemblies are listed in foundation phase 3.
```json
{
  "name": "Project.Runtime.Core",
  "rootNamespace": "Project.Runtime.Core",
  "references": [],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "autoReferenced": true,
  "noEngineReferences": false
}
```

## Red lines

- No `Resources` at runtime, and no `Resources.Load` in a hot path (ADR-0001, C-007).
- No global mutable singletons (ADR-0002).
- No `async void`, and no second async library (ADR-0003).
- No assembly cycles, and no runtime to editor reference.
- No unversioned save payload.
- No secrets in the project (see [doctrine/01-safety.md](../../doctrine/01-safety.md)).
- No hard-coded scene paths; resolve scenes by name or label.
- No secret in `PlayerPrefs`: it is stored unencrypted (C-102).
- No `GameManager` holding game logic; split and compose (ADR-0002).
- No `Object.DestroyImmediate` in runtime code; it is edit-mode only (C-174).
- No addressable handle that is never released, and no wait that outlives
  its owner.

## Verify

- The solution compiles with no cycles, and the dependency check is clean.
- One vertical slice runs in a test scene with no manual setup.
- Save round-trips: write, read back, compare, in a test.
- A fresh clone opens with no missing references and no reimport errors.
- The `Done when` gate of [workflows/foundation.md](../../workflows/foundation.md) passes.

## Handoff

- Frame cost of a structural choice -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- CI, test runners, build profiles -> [../loom-release/SKILL.md](../loom-release/SKILL.md).
- Level and sprite structure -> [../loom-2d/SKILL.md](../loom-2d/SKILL.md) or [../loom-3d/SKILL.md](../loom-3d/SKILL.md).
- Assets, materials, batching -> [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Storage and netcode limits on device -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
