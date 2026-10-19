---
name: loom-3d
description: "Unity 3D work: character movement, physics and colliders, NavMesh navigation, terrain blockout, Cinemachine cameras, LOD and occlusion culling, rigging and Timeline."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: 3d
  tier: 3
  triggers: ["3d", "navmesh", "character controller", "rigidbody", "collider", "terrain", "probuilder", "cinemachine", "lod", "occlusion culling", "animation rigging", "timeline", "level design"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.cinemachine 3.x", "com.unity.ai.navigation 2.x", "com.unity.animation.rigging 1.x"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/PhysicsOverview", "docs.unity3d.com/Packages/com.unity.ai.navigation"]
---

# loom-3d — 3D Development

Work [workflows/3d.md](../../workflows/3d.md) in order. API facts: [references/claims.md](../../references/claims.md).

## Decide first

| Question | Default |
|---|---|
| Player movement | Kinematic `CharacterController` for authored feel, `Rigidbody` when physics-driven |
| Physics body | `MovePosition` with interpolation, never `transform` writes |
| Navigation | `NavMeshSurface` baked offline, `NavMeshAgent` only for pathing AI |
| Cameras | Cinemachine: one brain, one virtual camera per shot |
| Blockout | ProBuilder greybox, bake nav and lighting, then art pass |
| Visibility | LOD group per prop cluster, baked occlusion in closed interiors |

## Decision tree

- **Kinematic or dynamic player?** → authored movement is kinematic; ragdolls and physics puzzles are dynamic. One body, one approach.
- **Static or dynamic batching?** → SRP Batcher for opaque geometry sharing a material, GPU instancing for repeats (C-011).
- **Baked or realtime lighting?** → bake static lightmaps; realtime only for moving lights, off on mobile.
- **Timeline or custom animation?** → Timeline for scripted sequences, code for gameplay state machines.
- **ProBuilder or imported mesh?** → ProBuilder for blockout, collision and lightmap UVs; imported art gets a simple collider.
- **LOD and occlusion strategy?** → LOD group per prop cluster, baked occlusion per closed interior, both checked in the frame debugger.
- **Camera feels unsmooth?** → tune Cinemachine damping and the brain update, not hand-written camera code.

## Setup defaults

| Setting | Default |
|---|---|
| `Rigidbody.interpolation` | `Interpolate` on every script-driven body |
| Collision detection | `Discrete`; `ContinuousDynamic` for fast movers, `ContinuousSpeculative` for kinematic |
| Layer collision matrix | Enable only the pairs the game uses |
| Solver iterations | Engine defaults (6 / 1); raise only against measured jitter |
| Contact offset | Leave `Physics.defaultContactOffset` alone; tune thin colliders individually |
| `NavMeshSurface` agent | Radius 0.5 m, height 2.0 m, max slope 45° |
| `NavMeshSurface` voxel size | Keep the agent type default (about 0.17 m); coarsen for bake time |
| Cinemachine blend | `EaseInOut` for gameplay cameras, `Cut` for hard cuts |
| Cinemachine damping | 0.2–0.5 s on a follow rig, never zero |
| `CinemachineBrain` update | `Smart Update` (default); `Late Update` for rigid-body targets |
| `LODGroup` | Screen-relative transition height 0.2–0.3, three levels plus a culled level |
| Occlusion | Baked for closed interiors, re-baked after every level edit |
| Terrain collision | The terrain's own collider; mesh colliders only for carved holes |
| `Animator` culling | `CullUpdateTransforms` for offscreen characters (C-040) |
| Timeline | `Director` on `GameTime`, `Animation` and `Audio` tracks on scene objects |

Bake via the editor API (`NavMeshSurface.BuildNavMesh()`), never a GUI step (ADR-0007).

## Idiomatic C#

```csharp
// Kinematic player; input is injected by the input layer.
public sealed class KinematicMover : MonoBehaviour
{
    [SerializeField] float speed = 5f, gravity = -20f;
    CharacterController _cc;
    Vector2 _move;
    Vector3 _velocity;
    public void SetMove(Vector2 v) => _move = v;
    void Awake() => _cc = GetComponent<CharacterController>();
    void Update()
    {
        Vector3 dir = transform.right * _move.x + transform.forward * _move.y;
        if (dir.sqrMagnitude > 1f) dir.Normalize();
        if (_cc.isGrounded && _velocity.y < 0f) _velocity.y = 0f;
        _velocity.y += gravity * Time.deltaTime;
        _cc.Move((dir * speed + _velocity) * Time.deltaTime);
    }
}
```

```csharp
// Dynamic body; MovePosition keeps the solver in charge of motion.
public sealed class RigidbodyMover : MonoBehaviour
{
    [SerializeField] float speed = 5f;
    Rigidbody _body;
    void Awake()
    {
        _body = GetComponent<Rigidbody>();
        _body.interpolation = RigidbodyInterpolation.Interpolate;
        _body.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
    }
    void FixedUpdate()
        => _body.MovePosition(_body.position + transform.forward * (speed * Time.fixedDeltaTime));
}
```

```csharp
// AI agent; cache the component and re-path on a timer.
public sealed class EnemyAgent : MonoBehaviour
{
    [SerializeField] float repathInterval = 0.35f;
    NavMeshAgent _agent;
    Transform _target;
    float _nextRepath;
    void Awake() => _agent = GetComponent<NavMeshAgent>();
    void SetTarget(Transform t) { _target = t; _nextRepath = 0f; }
    void Update()
    {
        if (_target == null || Time.time < _nextRepath) return;
        _nextRepath = Time.time + repathInterval;
        _agent.SetDestination(_target.position);
    }
}
```

```csharp
using Unity.Profiling;
static readonly ProfilerMarker s_Scan = new ProfilerMarker("AI.Scan");
static readonly Collider[] s_Hits = new Collider[8];   // preallocated, never grown
void Update()
{
    using (s_Scan.Auto())
    {
        int n = Physics.OverlapSphereNonAlloc(transform.position, radius, s_Hits, mask);
        for (int i = 0; i < n; i++) { /* react to s_Hits[i] */ }
    }
}
```

```csharp
// Cache the hash; never hand a string to an Animator setter.
static readonly int s_SpeedHash = Animator.StringToHash("Speed");
static readonly int s_GroundedHash = Animator.StringToHash("Grounded");
Animator _anim;
void Awake() => _anim = GetComponent<Animator>();
void SetState(float speed, bool grounded)
{
    _anim.SetFloat(s_SpeedHash, speed);
    _anim.SetBool(s_GroundedHash, grounded);
}
```

`LODGroup`: one group per prop cluster, an explicit low-poly final level, empty culled level.

## Red lines

- No per-frame `GetComponent`, `Find`, `Camera.main` or allocating physics query.
- No non-convex `MeshCollider` on a moving `Rigidbody` (C-041).
- No `Physics.SyncTransforms` inside a loop; it forces a full physics sync.
- No `transform.position` writes on a physics body; move it with interpolation.
- No static geometry left unbaked for navigation or lighting after an edit.
- No `LODGroup` with empty, mis-ordered or missing lower-detail levels.
- No allocation in `Update`: no LINQ, no closures, no string concatenation.
- No string-keyed `Animator` parameters at runtime (C-040).

## Verify

- The player crosses the level at the target frame rate without tunnelling or sticking.
- A profiler capture shows zero bytes allocated per frame during movement and AI repathing.
- The baked NavMesh covers the playable area and every agent path completes.
- LOD swaps and occlusion show up in the frame debugger and render statistics.
- A release-like device build holds the target frame rate on the floor device.
- `Done when` from [workflows/3d.md](../../workflows/3d.md) is satisfied.

## Handoff

- Frame timing, draw calls, GC → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Materials, lighting, shaders → [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Menus and HUD → [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- VR or AR variants of the scene → [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
