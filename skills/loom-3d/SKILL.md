---
name: loom-3d
description: "Use for Unity 3D work: character movement, physics bodies and colliders, NavMesh navigation, terrain blockout, Cinemachine cameras, LOD groups and occlusion culling, rigging, Timeline sequences and level design. Apply it to any 3D scene, character or level work."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: 3d
  tier: 3
  triggers: ["3d", "navmesh", "character controller", "rigidbody", "collider", "terrain", "probuilder", "cinemachine", "lod", "occlusion culling", "animation rigging", "timeline", "level design"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.cinemachine 3.x", "com.unity.ai.navigation 2.x", "com.unity.animation.rigging 1.x"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/PhysicsOverview", "docs.unity3d.com/Packages/com.unity.ai.navigation"]
---

# loom-3d — 3D Development

Work [workflows/3d.md](../../workflows/3d.md) in order. API facts:
[references/claims.md](../../references/claims.md).

## When to use

- A character moves and the body type is undecided.
- A scene needs colliders, a layer matrix or a physics material.
- An agent navigates and the bake is missing or stale.
- A camera follows, blends or cuts between shots.
- A level is blocked out, and the LOD and the occlusion plan are open.
- A scripted sequence is authored and Timeline is the candidate.

## When not to use

- A 2D project, or a 2D sprite used in a 3D scene ->
  [../loom-2d/SKILL.md](../loom-2d/SKILL.md).
- A question about Unity itself rather than a change -> stay in the router,
  [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- Materials, shaders, the look or the quality tiers ->
  [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Frame time, draw calls or memory ->
  [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- The same scene inside a headset -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).

## Pick the approach

| Question | Default |
|---|---|
| Player movement | Kinematic `CharacterController` for authored feel, `Rigidbody` when physics-driven (C-115) |
| Physics body | `MovePosition` with interpolation, never `transform` writes |
| Navigation | `NavMeshSurface` baked offline (C-092), `NavMeshAgent` only for pathing AI |
| Cameras | one `CinemachineBrain`, one `CinemachineCamera` per shot (C-197) |
| Blockout | a greybox pass, then bake nav and lighting, then the art pass |
| Visibility | an LOD group per prop cluster (C-091), baked occlusion in closed interiors (C-116) |

Narrow it further:

- Kinematic or dynamic player? Authored movement is kinematic; ragdolls and
  physics puzzles are dynamic. One body, one approach.
- Static or dynamic batching? The SRP Batcher for opaque geometry that
  shares a material (C-010), GPU instancing for repeats (C-011).
- Baked or realtime lighting? Bake static lightmaps; realtime only for
  lights that must move, off on mobile.
- Timeline or custom animation? Timeline for scripted sequences, code for
  gameplay state machines.
- Blockout tool or imported mesh? A blockout tool for the blockout. An
  imported mesh needs proper lightmap UVs to be lit by a baked lightmap
  (C-107); imported art gets a simple collider.
- LOD and occlusion strategy? An LOD group per prop cluster, baked occlusion
  per closed interior, both checked in a capture.
- Camera feels unsmooth? Tune the Cinemachine damping and the brain update
  method, not hand-written camera code.

## Setup defaults

| Setting | Default | Evidence |
|---|---|---|
| `Rigidbody.interpolation` | `Interpolate` on every script-driven body; it is off by default | C-075 |
| Collision detection | `Discrete`, `Continuous`, `ContinuousDynamic` or `ContinuousSpeculative` | C-203 |
| Layer collision matrix | only the pairs the game uses | Project default - tune against the solver time |
| Solver iterations | the project-wide default; raise only against measured jitter | C-173, C-204 |
| Contact offset | the project-wide default; tune thin colliders individually | C-204 |
| Navigation bake | `NavMeshSurface` bakes the mesh at bake time, `NavMeshAgent` reads it at runtime | C-202 |
| `NavMeshSurface` agent | radius, height and slope from the navigation decision file | Project default - tune against the agent radius |
| `NavMeshSurface` bake | tile size and voxel size stay at the agent type default | C-117 |
| Cinemachine cameras | one `CinemachineBrain` and one `CinemachineCamera` per shot | C-197 |
| Cinemachine blend | a `CinemachineBlendDefinition` of `EaseInOut` for gameplay cameras, `Cut` for a hard cut | C-199 |
| Cinemachine damping | a non-zero smoothing time on a follow rig | Project default - tune against the camera lag |
| `CinemachineBrain` update | an `UpdateMethod` of `SmartUpdate`, `LateUpdate`, `FixedUpdate` or `ManualUpdate` | C-198 |
| `LODGroup` | three detail levels plus an empty culled level | C-091, Project default - tune against the LOD heights |
| Occlusion | baked for closed interiors, re-baked after every level edit | C-116 |
| Terrain collision | the terrain's own collider; mesh colliders only for carved holes | Project default - tune against the terrain shape |
| `Animator` culling | `CullUpdateTransforms` for offscreen characters | C-040 |
| Timeline | a `PlayableDirector` with a `DirectorUpdateMode` of `GameTime`, `UnscaledGameTime`, `DSPClock` or `Manual` | C-200 |

Bake through the editor API (`NavMeshSurface.BuildNavMesh()`), never a GUI
step (ADR-0007, C-092).

## Examples

```csharp
// Kinematic player; input is injected by the input layer.
// CharacterController moves without a rigidbody and is constrained by collisions (C-115).
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
        _body.interpolation = RigidbodyInterpolation.Interpolate;   // off by default (C-075)
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
static readonly ProfilerMarker s_Scan = new ProfilerMarker("AI.Scan");   // C-085
static readonly Collider[] s_Hits = new Collider[8];   // preallocated, never grown
void Update()
{
    using (s_Scan.Auto())
    {
        int n = Physics.OverlapSphereNonAlloc(transform.position, radius, s_Hits, mask);  // C-182
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

```csharp
// Find the objects of a type once, with the sort mode the query needs.
var found = Object.FindObjectsByType<Pickup>(FindObjectsSortMode.None);   // C-071, C-170
```

```csharp
// One call sets position and rotation, so the transform is written once.
transform.SetPositionAndRotation(nextPosition, nextRotation);   // C-180
```

`Mesh.SetVertices` copies the data into the mesh, so the source list is
reusable afterwards (C-181). A Timeline sequence runs on a `PlayableGraph`
(C-118). An `LODGroup` is one group per prop cluster, with an explicit
low-poly final level and an empty culled level (C-091).

## Red lines

- No per-frame `GetComponent`, `Find`, `Camera.main` or allocating physics query (C-002, C-006, C-070, C-182).
- No `FindObjectsOfType`; use `FindObjectsByType` with a `FindObjectsSortMode` (C-071, C-170).
- No non-convex `MeshCollider` on a moving `Rigidbody` (C-041).
- No `Physics.SyncTransforms` inside a loop; one sync per frame is the project limit.
- No `transform.position` writes on a physics body; move it with interpolation (C-075).
- No static geometry left unbaked for navigation or lighting after an edit (C-092, C-116).
- No `LODGroup` with empty, mis-ordered or missing lower-detail levels (C-091).
- No allocation in `Update`: no LINQ, no closures, no string concatenation.
- No string-keyed `Animator` parameters at runtime.
- No `Animator` left without a culling mode for offscreen characters (C-040).
- No 2.x Cinemachine names; the camera type is `CinemachineCamera` (C-197).

## Verify

- The player crosses the level at the target frame rate without tunnelling or sticking.
- A profiler capture shows zero bytes allocated per frame during movement and AI repathing.
- The baked NavMesh covers the playable area and every agent path completes.
- The LOD swaps and the occlusion show up in the capture below.
- A release-like device build holds the target frame rate on the floor device.
- The `Done when` gate of [workflows/3d.md](../../workflows/3d.md) passes.

```text
HUMAN HANDOFF
What:   Capture the LOD swaps and the occlusion results of the test scene
Why:    The frame debugger is a window-only tool, so the agent cannot read
        the culled object list itself at any tier
Steps:  1) Open the test scene in the editor
        2) Open the frame debugger and step through the camera path
        3) Record which LOD level each prop shows and which objects the
           occlusion pass culled
        4) Report the swap points and the culled object names
Verify: every prop swaps at its recorded height and the interior objects
        behind a closed wall are culled
```

## Handoff

- Frame timing, draw calls, GC -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Materials, lighting, shaders -> [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Menus and HUD -> [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- VR or AR variants of the scene -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
