# Anti-Patterns

Unified table merging the recurring mistakes found across the source repositories. Each fix cites the rule or claim that governs it.

## HOW TO USE

1. Scan **TOP 10 BY SEVERITY** first; if the symptom matches, jump to that `AP-nnn`.
2. Otherwise find the symptom in a domain section, then read the **Fix** cell for the construct to change.
3. The **Claim** cell: `C-nnn` points into [claims.md](claims.md); `loom-*` names the owning skill; anything else names a doctrine, ADR, or workflow.
4. Apply the fix, then prove it against the owning workflow's `Done when` gate — a fix is not done until that gate passes.
5. A row with no `C-nnn` needs one: verify against the primary source first, then add it to the registry (ADR-0012).

## TOP 10 BY SEVERITY

1. AP-001 — per-frame `Update` polling: tax on every frame
2. AP-007 — `Resources` at runtime: build bloat, no unload
3. AP-009 — static mutable singleton: hidden deps, test order
4. AP-019 — LINQ in a hot path: churn every frame
5. AP-036 — physics query array per frame: GC plus CPU
6. AP-022 — texture/audio decompressed at load: memory spike
7. AP-048 — `Shader.Find` at runtime: slow, fails in builds
8. AP-005 — use after `Destroy`: fake-null exception
9. AP-076 — reflection-only code: broken under IL2CPP
10. AP-074 — secrets in the repo: credential leak

## Runtime & lifecycle

owner: skills/loom-performance/SKILL.md, workflows/performance.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-001 | `Update` polling every frame | Polls state | Tax every frame | Tick on event | doctrine 04 |
| AP-002 | `Camera.main` in a hot loop | Tagged search | CPU cost | Cache in `Awake` | C-002 |
| AP-003 | `GetComponent` per frame | Lookup in `Update` | CPU and alloc | Cache in `Awake` | C-006 |
| AP-004 | `Find*` scene searches | `FindObjectsOfType` | Deprecated, stalls | Serialized reference | C-002 |
| AP-005 | Use after `Destroy` | Same-frame access | "Fake null" NRE | Null-check `== null` | C-003 |
| AP-006 | `Instantiate`/`Destroy` loop | Spawn per event | GC spikes, stutter | Pool and reuse | C-001 |
| AP-007 | `Resources.Load` at runtime | Load in `Start` | No unload, bloat | Addressables handle | C-007 |
| AP-008 | `UnloadUnusedAssets` hot path | Called mid-game | Long stall | Release Addressables | C-044 |
| AP-009 | Static mutable singleton | `static` state | Hidden deps | Interfaces + DI | ADR-0002 |
| AP-010 | God MonoBehaviour | One script owns all | Untestable | Split and compose | ADR-0002 |
| AP-011 | `InvokeRepeating` timers | Interval callback | Drifts, uncancellable | `Awaitable` timer | ADR-0003 |
| AP-012 | `async void` outside handlers | `async void` method | Exceptions lost | `Awaitable` + token | C-005 |
| AP-013 | Un-awaited `Awaitable` | No `await` | Outlives caller | `await` it | C-005 |
| AP-014 | Coroutine outlives disable | Started in `OnEnable` | Keeps running | `StopCoroutine` on disable | ADR-0003 |
| AP-015 | Event never unsubscribed | `+=` with no `-=` | Leak, NRE | Unsubscribe in `OnDisable` | doctrine 03 |
| AP-016 | String-keyed Animator | `SendMessage` | Typos fail silently | Cached hash, typed call | C-040 |

## Memory & GC

owner: skills/loom-performance/SKILL.md, workflows/performance.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-017 | String concatenation per frame | `a + b` in `Update` | Alloc per frame | TMP `SetText` | C-045 |
| AP-018 | String formatting per frame | `$"{x:F2}"` | Alloc per frame | Cache the string | C-045 |
| AP-019 | LINQ in a hot path | `.Where().Select()` | Alloc churn | Manual loop, cached | doctrine 04 |
| AP-020 | Boxing in generic calls | Value type as `object` | Hidden alloc | Generic `T` overloads | doctrine 04 |
| AP-021 | `foreach` over `IEnumerable<T>` | Interface enum | Only `IEnumerable` allocates | Index `List<T>` | loom-performance |
| AP-022 | Texture/audio decompressed at load | Uncompressed import | Memory spike | Compress per platform | C-043 |
| AP-023 | `mesh.vertices` per access | Property read | Whole array copy | Cache the array | doctrine 04 |
| AP-024 | `GetComponentsInChildren` per frame | Hierarchy scan | O(n) plus alloc | Cache the array | C-006 |
| AP-025 | `Resources` folder bloat | Assets parked there | Folder ships in build | Move to Addressables | C-007 |

## Physics & 2D/3D

owner: skills/loom-3d/SKILL.md, workflows/3d.md, skills/loom-2d/SKILL.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-026 | Non-convex `MeshCollider`, moving | On a moving body | Invalid physics | Convex or primitives | C-041 |
| AP-027 | Trigger collider used for a grab | IsTrigger on pickup | Grabs fail | Non-trigger + Rigidbody | C-023 |
| AP-028 | Overlapping rigidbodies fighting | Stacked bodies | Jitter, solver cost | Separate colliders | C-042 |
| AP-029 | `Physics.SyncTransforms` loop | Sync per iteration | Doubles physics cost | Move, never teleport | C-004 |
| AP-030 | Moved transform, no interp | Direct position writes | Visible stepping | `MovePosition` + interp | C-042 |
| AP-031 | Rigidbody never sleeps | Woken every frame | Solver cost | Let it sleep | C-042 |
| AP-032 | Raycast on the wrong layer | Mask includes all | Hits through walls | Layer mask, matrix | C-004 |
| AP-033 | `Collider2D`/`Rigidbody2D` mismatch | Trigger on static body | Detection fails | Body on the mover | C-041 |
| AP-034 | Static collider with a Rigidbody | Body on geometry | Wasted solver | Remove the body | C-042 |
| AP-035 | Non-uniform scale on physics | Scaled transform | Contact drift | Bake scale into mesh | C-041 |
| AP-036 | Physics query array per frame | `RaycastHit[]` alloc | GC plus CPU | Non-alloc query | C-004 |

## Graphics & URP

owner: skills/loom-graphics/SKILL.md, workflows/graphics.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-037 | Per-object material | `new Material` / `SetColor` | Breaks SRP Batcher | `MaterialPropertyBlock` | C-010 |
| AP-038 | `Shader.PropertyToID` hot path | Lookup per call | String hashing | Cache the id | C-014 |
| AP-039 | Per-object shader variants | Variant per material | Batcher breaks | Few shared variants | C-010 |
| AP-040 | GPU instancing, wrong shader | Instancing unchecked | Nothing instanced | Instancing-enabled shader | C-011 |
| AP-041 | Transparent stacking | Layered alpha quads | Fill-rate collapse | Fewer layers, cut alpha | C-012 |
| AP-042 | Real-time shadows on mobile | Every light casts | GPU cost per light | Baked shadows | C-012 |
| AP-043 | Texture import uncompressed | Default settings | Memory, load spike | ASTC mobile, BC desktop | C-043 |
| AP-044 | Unbaked lightmaps at runtime | Realtime-only lighting | CPU cost | Bake static + probes | C-013 |
| AP-045 | No LOD groups | Full-detail meshes | Vertices, draw calls | LOD Group per set | C-012 |
| AP-046 | `Camera.clearFlags` per frame | Written in `Update` | Pointless churn | Set once in setup | C-001 |
| AP-047 | Pipeline asset at defaults | URP asset untouched | Wrong shadows, tiers | Set tiers, shadows, MSAA | C-013 |
| AP-048 | `Shader.Find` at runtime | Lookup per call | Slow, fails in builds | Serialized references | C-014 |

## UI & audio

owner: skills/loom-ui-audio/SKILL.md, workflows/ui-audio.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-049 | TMP text rebuilt every frame | `text = s` | Alloc plus rebuild | `SetText` overloads | C-045 |
| AP-050 | Many sibling Canvases | Canvas per widget | Unbatched | One canvas, nested | loom-ui-audio |
| AP-051 | UI Toolkit for world UI | UIDocument in build | Wrong runtime layout | uGUI for world-space | loom-ui-audio |
| AP-052 | AudioSource per SFX | New source per sound | Alloc, mixing churn | Pool sources + mixer | loom-ui-audio |
| AP-053 | Long music in memory | Whole clip in RAM | Memory spike | `LoadType.Streaming` | loom-ui-audio |
| AP-054 | No mixer snapshot design | Levels per clip | No ducking, no bus | Master/Music/SFX | loom-ui-audio |
| AP-055 | `PlayClipAtPoint` in gameplay | One-shot helper | No control, no pooling | Pooled `AudioSource` | loom-ui-audio |
| AP-056 | No spatial blend | 2D clip in 3D scene | Flat, wrong feel | 3D blend + spatial | loom-ui-audio |
| AP-057 | Legacy `Input.GetAxis` | New-Input project | No rebinding | Input System actions | loom-ui-audio |
| AP-058 | New Input System, legacy | `InputSystem` namespace | Package missing | Add the package | loom-ui-audio |

## XR

owner: skills/loom-xr/SKILL.md, workflows/xr.md, references/xr-dialect.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-059 | Deprecated `OnSelectEntered` | Old XRI event names | Never fires | `selectEntered`/`Exited` | C-021 |
| AP-060 | Smooth locomotion as default | Continuous move | Nausea | Teleport + snap turn | C-027 |
| AP-061 | No comfort options | No settings menu | Motion sickness | Turn, vignette, recenter | C-027 |
| AP-062 | Multi-pass stereo | Mult-pass enabled | Double submission | Single-pass instanced | C-020 |
| AP-063 | Per-frame GC in XR hot paths | Allocs per frame | Stutter in stereo | Cache, pool, non-alloc | doctrine 04 |
| AP-064 | Un-anchored AR/MR content | No anchor | Drifts away | Anchor + world-lock | C-026 |
| AP-065 | Destroying a selected object | `Destroy` in handler | Throws NRE | Release, then destroy | loom-xr |
| AP-066 | No focus-regain handling | No resume path | Input dead | Re-enable, re-register | loom-xr |
| AP-067 | World-unlocked content in MR | World-space object | Slides off the room | Scene anchor + world-lock | C-026 |
| AP-068 | Content at non-1:1 scale | Asset scaled in scene | Wrong size | 1 unit = 1 m | loom-xr |
| AP-069 | Legacy `XRSettings` API | `XRSettings.enabled` | Deprecated | Plug-in Mgmt + OpenXR | C-020 |

## Project & release

owner: skills/loom-project/SKILL.md, workflows/foundation.md, skills/loom-release/SKILL.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-070 | One giant asmdef | All scripts in one | Slow compiles | Runtime/Editor/Tests asmdefs | C-050 |
| AP-071 | Missing `.meta` files | Moved without meta | Missing-script warnings | Commit `.meta` | ADR-0010 |
| AP-072 | Generated folders committed | `Library/` in git | Merge noise | Ignore them | doctrine 05 |
| AP-073 | Unpinned package versions | Floating versions | Broken repro | Pin versions + lock | ADR-0004 |
| AP-074 | Secrets in the repo | Token in source | Credential leak | Env vars, not files | doctrine 01 |
| AP-075 | `Debug.Log` per frame | In release build | CPU, log spam | Strip in release | doctrine 04 |
| AP-076 | Reflection-only code | `GetType`, `SendMessage` | Stripped in build | Preserve attribute | ADR-0009 |
| AP-077 | No CI test run | Manual build | Regressions ship | GameCI: test + build | C-053 |
| AP-078 | No release build profile | One settings set | Wrong defines, tier | Build Profiles per target | C-051 |
| AP-079 | Store compliance skipped | No privacy sheet | Submission rejected | Store checklist | C-051 |
| AP-080 | Auto-running editor hooks | `[InitializeOnLoad]` | Recompile loops | Opt-in commands | ADR-0010 |
| AP-081 | Unchecked null dereference | Used after destroy | Silent NRE | Check `== null` first | C-003 |

## Agent-specific

owner: skills/unity-loom/SKILL.md, doctrine/03-state-freshness.md

| ID | Anti-pattern | Shows up | Why it fails | Fix | Claim |
|---|---|---|---|---|---|
| AP-082 | Acting on stale state | Edit before compile | Edits lost | Refresh, compile, read back | doctrine 03 |
| AP-083 | Tool success, no read-back | No state re-read | Silent failure | Read back, log evidence | ADR-0008 |
| AP-084 | GUI instructions for a human | Editor menu steps | Dead step | CLI call, else `HUMAN HANDOFF` | ADR-0007 |
| AP-085 | Unsourced version claim | No registry id | Hallucinated code | Cite a `C-nnn` | ADR-0012 |
| AP-086 | Copying upstream examples | Old XRI names | Dialect drift | One dialect + map | ADR-0005 |
| AP-087 | No perf baseline | "It feels faster" | No proof | Capture a baseline | loom-performance |
| AP-088 | Scoring from screenshots | Score off a render | Non-deterministic | Log discrete events | C-061 |
| AP-089 | Short device run | Two-minute soak | Misses throttling | 20+ minute soak | loom-performance |
| AP-090 | Restating guidance per skill | Same rule rewritten | Contradiction | Link the claim | ADR-0012 |
