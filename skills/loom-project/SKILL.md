---
name: loom-project
description: "Unity project foundation and architecture: folder and assembly structure, version control, packages, ScriptableObject data, versioned save systems, dependency injection, event channels, state machines, netcode and Addressables. Use for project setup, architecture decisions, refactoring structure, multiplayer scaffolding or persistence."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: project
  tier: 1
  triggers: ["architecture", "asmdef", "assembly definition", "scriptableobject", "save system", "dependency injection", "service locator", "event bus", "state machine", "fsm", "netcode", "multiplayer", "project setup", "folder structure", "version control", "git", "upm package", "package manager", "scene management", "addressables"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/", "docs.unity3d.com/Packages/com.unity.netcode.gameobjects", "docs.unity3d.com/Packages/com.unity.addressables"]
---

# loom-project — Foundation & Architecture

Owns the project layout and how systems talk. Work
[workflows/foundation.md](../../workflows/foundation.md) in order; this file
picks the pattern.

## Pick the pattern

| Need | Pattern | Default | Authority |
|---|---|---|---|
| Wiring services | Composition | plain C# objects, refs serialized, built by one root | ADR-0002 |
| Two systems, no owner | Event channel | ScriptableObject channel asset | ADR-0002 |
| Many unrelated fans | Thin bus | one typed bus, explicit lifetime | ADR-0002 |
| Designer-authored data | ScriptableObject asset | read-only at runtime | workflow foundation |
| Service before any ref exists | Service locator | static registry, not mutable state | ADR-0002 |
| Modes of behaviour | State machine | enum + strategy, class FSM when it grows | workflow foundation |
| Multiplayer | Networked state | NGO `NetworkBehaviour`, minimal sync | package docs |
| Any I/O | Async | `Awaitable` + `CancellationToken` | ADR-0003 |
| Runtime assets | Addressables | load and release explicitly | ADR-0001, C-007 |

Which pattern do I need?

- Same feature → keep the direct reference.
- Across features, no owner → event channel asset.
- Fan-out to unrelated listeners → bus, and count them.
- Numbers a designer tunes → ScriptableObject asset.
- Progress that survives a restart → versioned payload, one writer.
- Modes with entry and exit rules → explicit state machine.
- Networked → settle transport and authority before gameplay code.

## Architecture defaults

| Concern | Default | Lives in |
|---|---|---|
| Assemblies | Core, Runtime, Editor, Tests; references point one way | one asmdef per folder |
| Cycles | none; Runtime never references Editor or Tests | dependency check |
| Serialization | private `[SerializeField]`; `[SerializeReference]` for polymorphic data | component fields |
| Events | channel assets before any bus | `ScriptableObjects/Channels` |
| Authored data | `[CreateAssetMenu]` assets, never mutated at runtime | `ScriptableObjects` |
| Save format | `schema` int plus one migration step per version | `Scripts/Core/Save` |

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

Async load — `Awaitable` with a token; the handle is released exactly once.
```csharp
public async Awaitable<GameObject> LoadAsync(string key, CancellationToken token)
{
    var handle = Addressables.LoadAssetAsync<GameObject>(key);
    while (!handle.IsDone)
        await Awaitable.NextFrameAsync(token);          // ADR-0003
    if (handle.Status != AsyncOperationStatus.Succeeded)
        throw new System.InvalidOperationException(key);
    return handle.Result;
}
```

Pass `destroyCancellationToken` so an unload cancels the wait; release the handle in `OnDestroy`.

Area check without per-call allocation (C-004).
```csharp
private readonly Collider[] m_Hits = new Collider[16];

public int CountHits(Vector3 center, float radius)
{
    return Physics.OverlapSphereNonAlloc(center, radius, m_Hits, m_Layer,
        QueryTriggerInteraction.Collide);
}
```

Assembly definition — one per feature, references by name, no cycles.
```json
{
  "name": "Game.Runtime",
  "rootNamespace": "Game.Runtime",
  "references": ["Game.Core"],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "autoReferenced": true,
  "noEngineReferences": false
}
```

Folder convention.
```text
Assets/_Project/{Art,Audio,Materials,Prefabs,Scenes,Settings,ScriptableObjects,UI}
Scripts/Core    -> Game.Core.asmdef      (plain C#, no scene refs)
Scripts/Runtime -> Game.Runtime.asmdef   (-> Core)
Scripts/Editor  -> Game.Editor.asmdef    (includePlatforms: Editor)
Scripts/Tests/{EditMode,PlayMode}
```

## Red lines

- No `Resources` at runtime, and no `Resources.Load` in a hot path (ADR-0001).
- No global mutable singletons (ADR-0002).
- No `async void`, and no second async library (ADR-0003).
- No assembly cycles, and no Runtime to Editor reference.
- No unversioned save payload.
- No secrets in the project (see [doctrine/01-safety.md](../../doctrine/01-safety.md)).
- No hard-coded scene paths; resolve scenes by name or label.
- No `GameManager` holding game logic; split and compose (ADR-0002).

## Verify

- The solution compiles with no cycles, and the dependency check is clean.
- One vertical slice runs in a test scene with no manual setup.
- Save round-trips: write, read back, compare, in a test.
- A fresh clone opens with no missing references and no reimport errors.
- `Done when` in [workflows/foundation.md](../../workflows/foundation.md) is met.

## Handoff

- Frame cost of a structural choice → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- CI, test runners, build profiles → [../loom-release/SKILL.md](../loom-release/SKILL.md).
- Level and sprite structure → [../loom-2d/SKILL.md](../loom-2d/SKILL.md) or [../loom-3d/SKILL.md](../loom-3d/SKILL.md).
- Assets, materials, batching → [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Storage and netcode limits on device → [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
