# Claim Registry

Single source of technical truth. A non-obvious, version-specific statement may be asserted **only** if it appears here with a source and a `verified-against` version ([ADR-0012](../docs/03-decision-records.md)).

Format: `ID | claim | source | verified-against`.

## Id allocation

Ids are permanent. A retired claim keeps its id, and an id is never reused for a
different fact. Each block below covers one subject area; a new claim takes the
next free id in the block whose area matches it.

| Block | Subject area |
|---|---|
| C-001 to C-019 | core engine and the render pipeline |
| C-020 to C-039 | XR, AR Foundation, the rig and the interaction model |
| C-040 to C-069 | animation, physics, audio, memory, the test framework, CI |
| C-070 to C-099 | engine searches, async, project assets, 2D, 3D, UI, input, netcode |
| C-100 to C-129 | test framework, netcode, build, XR types, localisation |
| C-130 to C-159 | AR types, localisation, release, platform security |
| C-160 to C-169 | reserved - editor tooling and diagnostics |
| C-170 to C-199 | engine runtime, physics, memory, editor state, CLI session, Cinemachine, timeline |
| C-200 to C-239 | package and platform APIs, open standards, player data |
| C-240 to C-259 | reserved - the next area to be opened |

A reserved block stays empty until a claim needs that area.

## Core engine

Engine and runtime API facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-001 | A disabled component incurs no update cost; a merely hidden renderer still renders if enabled | docs.unity3d.com/6000.3/Documentation/Manual/ | Unity 6000.3 |
| C-002 | `Camera.main` performs a tagged search; cache the reference instead of calling it per frame | docs.unity3d.com/6000.3/Documentation/ScriptReference/Camera-main | Unity 6000.3 |
| C-003 | `Destroy` is deferred to the end of the frame; a destroyed Unity object compares equal to `null` ("fake null") | docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.Destroy | Unity 6000.3 |
| C-004 | Non-alloc query variants avoid per-call array allocation | docs.unity3d.com/6000.3/Documentation/ScriptReference/Physics.OverlapSphere | Unity 6000.3 |
| C-005 | `Awaitable` is the modern engine async type and supports cancellation via `CancellationToken` | docs.unity3d.com/6000.3/Documentation/Manual/async-await-support | Unity 6000.3 |
| C-006 | `GetComponent` should be cached; `TryGetComponent` avoids a null-return allocation pattern | docs.unity3d.com/6000.3/Documentation/ScriptReference/Component.TryGetComponent | Unity 6000.3 |
| C-007 | `Resources` cannot unload assets granularly; Addressables are the runtime asset-loading default | docs.unity3d.com/Packages/com.unity.addressables@2.0 | Addressables 2.x |
| C-070 | `FindFirstObjectByType` is very resource intensive; not for per-frame use | docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.FindFirstObjectByType | Unity 6000.3 |
| C-071 | `FindObjectsByType` replaces `FindObjectsOfType` and takes a `FindObjectsSortMode` | docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.FindObjectsByType | Unity 6000.3 |
| C-072 | `Awaitable.NextFrameAsync` runs and completes on the main thread | docs.unity3d.com/6000.3/Documentation/ScriptReference/Awaitable.NextFrameAsync | Unity 6000.3 |
| C-073 | `Time.unscaledDeltaTime` ignores `timeScale` | docs.unity3d.com/6000.3/Documentation/ScriptReference/Time-unscaledDeltaTime | Unity 6000.3 |
| C-074 | `Application.targetFrameRate` is ignored when `vSyncCount` is non-zero | docs.unity3d.com/6000.3/Documentation/ScriptReference/Application-targetFrameRate | Unity 6000.3 |
| C-075 | `Rigidbody.interpolation` is off by default; physics then owns the transform | docs.unity3d.com/6000.3/Documentation/ScriptReference/Rigidbody-interpolation | Unity 6000.3 |
| C-076 | `ScriptableObject` data lives outside GameObjects and saves as an asset | docs.unity3d.com/6000.3/Documentation/ScriptReference/ScriptableObject | Unity 6000.3 |
| C-170 | `FindObjectsSortMode` offers only `None` and `InstanceID` (ascending) | docs.unity3d.com/6000.3/Documentation/ScriptReference/FindObjectsSortMode | Unity 6000.3 |
| C-171 | `Awaitable.WaitForSecondsAsync` takes a `CancellationToken` | docs.unity3d.com/6000.3/Documentation/ScriptReference/Awaitable.WaitForSecondsAsync | Unity 6000.3 |
| C-172 | `AwaitableCompletionSource` completes an `Awaitable` manually | docs.unity3d.com/6000.3/Documentation/ScriptReference/AwaitableCompletionSource | Unity 6000.3 |
| C-173 | `Physics.defaultSolverIterations` defaults to 6 and does not affect existing rigidbodies | docs.unity3d.com/6000.3/Documentation/ScriptReference/Physics-defaultSolverIterations | Unity 6000.3 |
| C-174 | `Object.DestroyImmediate` is edit-mode only; at runtime use `Destroy` | docs.unity3d.com/6000.3/Documentation/ScriptReference/Object.DestroyImmediate | Unity 6000.3 |
| C-175 | `SerializeReference` serializes a field as a reference, so polymorphic data survives serialization | docs.unity3d.com/6000.3/Documentation/ScriptReference/SerializeReference | Unity 6000.3 |
| C-176 | `HideFlags` controls destruction, saving and inspector visibility of an object | docs.unity3d.com/6000.3/Documentation/ScriptReference/HideFlags | Unity 6000.3 |
| C-177 | `Application.persistentDataPath` is the per-platform directory for data kept between runs | docs.unity3d.com/6000.3/Documentation/ScriptReference/Application-persistentDataPath | Unity 6000.3 |
| C-178 | `RuntimeInitializeOnLoadMethod` runs a callback in the startup sequence, ordered by `RuntimeInitializeLoadType` | docs.unity3d.com/6000.3/Documentation/ScriptReference/RuntimeInitializeOnLoadMethodAttribute | Unity 6000.3 |

## Graphics

Pipeline, batching and rendering facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-010 | The SRP Batcher batches by shader variant; sharing materials keeps batches intact | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0 | URP 17.x |
| C-011 | GPU instancing requires an instancing-enabled shader/material and compatible rendering path | docs.unity3d.com/6000.3/Documentation/Manual/GPUInstancing | Unity 6000.3 |
| C-012 | Overdraw from stacked transparency is the dominant fill-rate cost on mobile and XR | docs.unity3d.com/6000.3/Documentation/Manual/OptimizingGraphicsPerformance | Unity 6000.3 |
| C-013 | Unity 6 still ships the Built-in Render Pipeline, but a new project should start on URP or HDRP | docs.unity3d.com/6000.3/Documentation/Manual/ | Unity 6000.3 |
| C-014 | Shader variant stripping is configured per pipeline asset and build settings | docs.unity3d.com/6000.3/Documentation/Manual/shader-variant-stripping | Unity 6000.3 |
| C-077 | URP 17 renders through the render graph system for Scriptable Render Passes | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/render-graph | URP 17.0.4 |
| C-078 | `UniversalRenderPipelineAsset` holds URP settings and is a quality level | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset | URP 17.0.4 |
| C-105 | URP 17 offers the Forward, Forward+ and Deferred rendering paths | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/rendering-paths-landing | URP 17.0.4 |
| C-106 | The URP asset holds render pipeline settings such as depth and opaque textures | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/universalrp-asset | URP 17.0.4 |
| C-109 | URP decals are placed with the `DecalProjector` component | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.DecalProjector | URP 17.0.4 |
| C-206 | `Light2D` light types are Global, Point, Spot, Line and Freeform | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/api/UnityEngine.Rendering.Universal.Light2D | URP 17.0.4 |
| C-215 | `Texture2D` mipmap streaming is enabled per texture rather than project-wide | docs.unity3d.com/6000.3/Documentation/Manual/TextureStreaming | Unity 6000.3 |
| C-216 | `Shader.PropertyToID` returns the cached property id for a shader property, so one name always yields one id | docs.unity3d.com/6000.3/Documentation/ScriptReference/Shader.PropertyToID | Unity 6000.3 |

## XR

XR Interaction Toolkit, AR Foundation and rig facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-020 | Single-pass instanced rendering renders both eyes in one pass and is the XR default | docs.unity3d.com/6000.3/Documentation/Manual/SinglePassStereoRendering | Unity 6000.3 |
| C-021 | XRI's interaction model uses `selectEntered`/`selectExited` (not older `OnSelectEntered` handlers) | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6 | XRI 3.x |
| C-022 | `XROrigin` represents the XR rig tracking space | docs.unity3d.com/Packages/com.unity.xr.core-utils@2.4 | XR Core Utilities 2.x |
| C-023 | Direct/poke interactors use trigger colliders; grab interactables require a non-trigger collider and a Rigidbody | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6 | XRI 3.x |
| C-024 | AR Foundation requires a provider plug-in (ARCore/ARKit/OpenXR) enabled in XR Plug-in Management | docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0 | AR Foundation 6.x |
| C-025 | AR trackables are exposed through manager components (planes, images, faces, anchors, meshes, etc.) | docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0 | AR Foundation 6.x |
| C-026 | Placed AR content should be anchored to resist drift | docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0 | AR Foundation 6.x |
| C-027 | Comfort options (snap turn, vignette, teleport) reduce locomotion discomfort | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6 | XRI 3.x |
| C-028 | Meta MR Utility Kit exposes room/wall/floor/furniture scene data for MR placement | docs.unity3d.com/Packages/com.meta.xr.mrutilitykit | MRUK 7x |
| C-029 | A Meta XR SDK upgrade can break controller tracking; verify on device after upgrading | developers.meta.com/horizon | Meta XR SDK |
| C-030 | Apple visionOS rendering in Unity uses PolySpatial with the visionOS XR plug-in | docs.unity3d.com/Packages/com.unity.polyspatial@2.0 | PolySpatial 2.x |
| C-079 | `NearFarInteractor` uses a near and a far interaction caster | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.Interactors.NearFarInteractor | XRI 3.6.1 |
| C-080 | `movementType` is a property of the `XRGrabInteractable` component and picks velocity, kinematic or transform motion | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.Interactables.XRGrabInteractable | XRI 3.6.1 |
| C-081 | `InteractionLayerMask` gates the interaction layers an interactor may target | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.InteractionLayerMask | XRI 3.6.1 |
| C-082 | `TeleportationProvider` moves the XR Origin to the requested location | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.Locomotion.Teleportation.TeleportationProvider | XRI 3.6.1 |
| C-083 | `XRUIInputModule` sends UI input in XR | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.UI.XRUIInputModule | XRI 3.6.1 |
| C-084 | `ARSession` owns the AR session lifecycle; one is active | docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0/api/UnityEngine.XR.ARFoundation.ARSession | AR Foundation 6.0.8 |
| C-122 | `XRBaseInteractable` is the base type of the interactable family; its `MovementType` enum offers Instantaneous, Kinematic and VelocityTracking | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.Interactables.XRBaseInteractable.MovementType | XRI 3.6.1 |
| C-123 | `XRDirectInteractor` is the interactor for directly interacting with objects | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.Interactors.XRDirectInteractor | XRI 3.6.1 |
| C-124 | `XRRayInteractor` is the interactor for interacting with objects along a ray | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.Interactors.XRRayInteractor | XRI 3.6.1 |
| C-125 | `TrackedDeviceGraphicRaycaster` raycasts tracked devices against a `Canvas` | docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.6/api/UnityEngine.XR.Interaction.Toolkit.UI.TrackedDeviceGraphicRaycaster | XRI 3.6.1 |
| C-126 | OpenXR is configured through the XR Plug-in Management settings | docs.unity3d.com/Packages/com.unity.xr.openxr@1.14/manual/project-configuration | OpenXR 1.14.0 |
| C-127 | OpenXR feature groups group several features so they can be configured together | docs.unity3d.com/Packages/com.unity.xr.openxr@1.14/manual/features | OpenXR 1.14.0 |
| C-128 | OpenXR input requires enabling the interaction profile features for the device | docs.unity3d.com/Packages/com.unity.xr.openxr@1.14/manual/input | OpenXR 1.14.0 |
| C-129 | `ARSession.state` reports the state of the entire AR system | docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0/api/UnityEngine.XR.ARFoundation.ARSession | AR Foundation 6.0.8 |
| C-130 | `ARCameraManager` manages the life cycle of the `XRCameraSubsystem` | docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0/api/UnityEngine.XR.ARFoundation.ARCameraManager | AR Foundation 6.0.8 |
| C-131 | `ARAnchorManager` adds and tracks anchors | docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.0/api/UnityEngine.XR.ARFoundation.ARAnchorManager | AR Foundation 6.0.8 |

## Animation, physics, audio, memory

Runtime cost, physics and lifecycle facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-040 | `Animator.cullingMode` reduces transform work for offscreen characters | docs.unity3d.com/6000.3/Documentation/ScriptReference/Animator-cullingMode | Unity 6000.3 |
| C-041 | A non-convex MeshCollider is not valid on a moving Rigidbody | docs.unity3d.com/6000.3/Documentation/Manual/collider-mesh | Unity 6000.3 |
| C-042 | Rigidbody sleeping is default and reduces solver cost for idle bodies | docs.unity3d.com/6000.3/Documentation/Manual/RigidbodySleeping | Unity 6000.3 |
| C-043 | Texture compression format should match the platform (ASTC mobile/Quest, BC desktop) | docs.unity3d.com/6000.3/Documentation/Manual/class-TextureImporter | Unity 6000.3 |
| C-044 | `Resources.UnloadUnusedAssets` is expensive; prefer explicit Addressables release | docs.unity3d.com/Packages/com.unity.addressables@2.0 | Addressables 2.x |
| C-045 | TextMeshPro `SetText` overloads avoid string allocation compared to concatenation | docs.unity3d.com/Packages/com.unity.textmeshpro@3.2 | TMP 3.x |
| C-085 | `ProfilerMarker` labels a script block in the CPU Profiler | docs.unity3d.com/6000.3/Documentation/ScriptReference/Unity.Profiling.ProfilerMarker | Unity 6000.3 |
| C-086 | `ProfilerRecorder` reads counters and marker timings in release players too | docs.unity3d.com/6000.3/Documentation/ScriptReference/Unity.Profiling.ProfilerRecorder | Unity 6000.3 |
| C-087 | `MaterialPropertyBlock` varies properties per object without new materials | docs.unity3d.com/6000.3/Documentation/ScriptReference/MaterialPropertyBlock | Unity 6000.3 |
| C-179 | `NativeArray` is unmanaged memory you allocate and dispose explicitly | docs.unity3d.com/6000.3/Documentation/ScriptReference/Unity.Collections.NativeArray_1 | Unity 6000.3 |
| C-180 | `Transform.SetPositionAndRotation` is more efficient than assigning position and rotation separately | docs.unity3d.com/6000.3/Documentation/ScriptReference/Transform.SetPositionAndRotation | Unity 6000.3 |
| C-181 | `Mesh.SetVertices` copies your data into the mesh, so the source list can be reused | docs.unity3d.com/6000.3/Documentation/ScriptReference/Mesh.SetVertices | Unity 6000.3 |
| C-182 | `Physics.OverlapSphere` allocates an array; use the NonAlloc variant in hot paths | docs.unity3d.com/6000.3/Documentation/ScriptReference/Physics.OverlapSphere | Unity 6000.3 |
| C-183 | `Shader.PropertyToID` returns a unique int id for a shader property name | docs.unity3d.com/6000.3/Documentation/ScriptReference/Shader.PropertyToID | Unity 6000.3 |
| C-184 | `QualitySettings.shadowDistance` is the shadow drawing distance | docs.unity3d.com/6000.3/Documentation/ScriptReference/QualitySettings-shadowDistance | Unity 6000.3 |
| C-185 | Mipmap streaming optimizes GPU texture memory by loading lower mip levels on demand | docs.unity3d.com/6000.3/Documentation/Manual/TextureStreaming | Unity 6000.3 |
| C-203 | `CollisionDetectionMode` is Discrete, Continuous, ContinuousDynamic or ContinuousSpeculative | docs.unity3d.com/6000.3/Documentation/ScriptReference/CollisionDetectionMode | Unity 6000.3 |
| C-204 | `Physics.defaultContactOffset` and `Physics.defaultSolverIterations` are the project-wide physics defaults | docs.unity3d.com/6000.3/Documentation/ScriptReference/Physics-defaultContactOffset | Unity 6000.3 |

## 2D & 3D

Sprite, tilemap, physics and navigation facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-088 | A `SpriteAtlas` packs its sprites into one atlas | docs.unity3d.com/6000.3/Documentation/ScriptReference/U2D.SpriteAtlas | Unity 6000.3 |
| C-089 | `TilemapRenderer` culls the tilemap in chunks; the chunk size is a separate tilemap setting | docs.unity3d.com/6000.3/Documentation/ScriptReference/Tilemaps.TilemapRenderer | Unity 6000.3 |
| C-090 | `CompositeCollider2D` merges other 2D colliders into one | docs.unity3d.com/6000.3/Documentation/ScriptReference/CompositeCollider2D | Unity 6000.3 |
| C-091 | `LODGroup` switches LOD levels by the group's on-screen size | docs.unity3d.com/6000.3/Documentation/ScriptReference/LODGroup | Unity 6000.3 |
| C-092 | `NavMeshSurface` builds a NavMesh for its area, at runtime if asked | docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/api/Unity.AI.Navigation.NavMeshSurface | AI Navigation 2.0.16 |
| C-107 | A mesh needs proper lightmap UVs to be lit by a baked lightmap | docs.unity3d.com/6000.3/Documentation/Manual/Lightmapping | Unity 6000.3 |
| C-108 | An Adaptive Probe Volume is a group of Light Probes that provides lighting for its volume | docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.0/manual/probevolumes-concept | URP 17.0.4 |
| C-110 | A `ReflectionProbe` captures surrounding geometry for image-based reflections | docs.unity3d.com/6000.3/Documentation/ScriptReference/ReflectionProbe | Unity 6000.3 |
| C-111 | `AdvancedRuleOverrideTile`, `RuleOverrideTile` and `AutoTile` ship in com.unity.2d.tilemap.extras | docs.unity3d.com/Packages/com.unity.2d.tilemap.extras@6.0/api/UnityEngine.Tilemaps.AdvancedRuleOverrideTile | Tilemap Extras 6.x |
| C-112 | `Tilemap.GetTile` is an instance method, so the Tilemap reference must be cached | docs.unity3d.com/6000.3/Documentation/ScriptReference/Tilemaps.Tilemap | Unity 6000.3 |
| C-113 | `PixelPerfectCamera` keeps pixel art crisp and stable at different resolutions | docs.unity3d.com/Packages/com.unity.2d.pixel-perfect@1.0/api/UnityEngine.U2D.PixelPerfectCamera | Pixel Perfect 1.x |
| C-114 | `Sprite.Create` builds a Sprite at runtime | docs.unity3d.com/6000.3/Documentation/ScriptReference/Sprite.Create | Unity 6000.3 |
| C-115 | A `CharacterController` moves without a rigidbody and is constrained by collisions | docs.unity3d.com/6000.3/Documentation/ScriptReference/CharacterController | Unity 6000.3 |
| C-116 | Occlusion culling is a bake step that skips rendering objects fully hidden by others | docs.unity3d.com/6000.3/Documentation/Manual/OcclusionCulling | Unity 6000.3 |
| C-117 | `NavMeshSurface` bake settings include tile size and voxel size overrides | docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/api/Unity.AI.Navigation.NavMeshSurface | AI Navigation 2.0.16 |
| C-118 | A `PlayableGraph` manages Playables and links them to outputs | docs.unity3d.com/6000.3/Documentation/ScriptReference/Playables.PlayableGraph | Unity 6000.3 |
| C-119 | `ModelImporter.globalScale` is the global scale factor applied when importing a model | docs.unity3d.com/6000.3/Documentation/ScriptReference/ModelImporter-globalScale | Unity 6000.3 |
| C-120 | `Physics2D.OverlapCircle` allocates a result array; use the non-alloc overload in a hot path | docs.unity3d.com/6000.3/Documentation/ScriptReference/Physics2D.OverlapCircle | Unity 6000.3 |
| C-121 | Addressables' `AssetReferenceAtlasedSprite` references sprites that live inside a SpriteAtlas | docs.unity3d.com/Packages/com.unity.addressables@2.0/api/UnityEngine.AddressableAssets.AssetReferenceAtlasedSprite | Addressables 2.0.8 |
| C-201 | A rule tile derives from `TileBase`; `TileBase.m_DefaultSprite` and `RuleTile.m_TileToPlace` are its serialised fields | docs.unity3d.com/Packages/com.unity.2d.tilemap.extras@6.0/api/UnityEngine.Tilemaps.RuleTile | Tilemap Extras 6.x |
| C-202 | `NavMeshSurface` bakes a NavMesh at bake time, and `NavMeshAgent` reads that baked NavMesh at runtime | docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/api/Unity.AI.Navigation.NavMeshSurface | AI Navigation 2.0.16 |
| C-205 | `PixelPerfectCamera` exposes `assetsPPU` and `refResolution` | docs.unity3d.com/Packages/com.unity.2d.pixel-perfect@1.0/api/UnityEngine.U2D.PixelPerfectCamera | Pixel Perfect 1.x |

## Cinemachine and timeline

Camera rig and sequencer facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-197 | Cinemachine 3.x names the virtual camera `CinemachineCamera`; the 2.x `VirtualCamera` was renamed | docs.unity3d.com/Packages/com.unity.cinemachine | Cinemachine 3.x |
| C-198 | `CinemachineBrain.UpdateMethod` is SmartUpdate, LateUpdate, FixedUpdate or ManualUpdate | docs.unity3d.com/Packages/com.unity.cinemachine | Cinemachine 3.x |
| C-199 | `CinemachineBlendDefinition` is Cut, EaseInOut, EaseIn, EaseOut or HardInOut | docs.unity3d.com/Packages/com.unity.cinemachine | Cinemachine 3.x |
| C-200 | `PlayableDirector` exposes `DirectorUpdateMode` as GameTime, UnscaledGameTime, DSPClock or Manual | docs.unity3d.com/6000.3/Documentation/ScriptReference/Playables.PlayableDirector | Unity 6000.3 |

## UI, input & audio

UI, text, input and sound facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-093 | UI Toolkit structures UI with UXML or C# and styles it with USS | docs.unity3d.com/6000.3/Documentation/Manual/UIElements | Unity 6000.3 |
| C-094 | `InputAction` is a named input signal; `InputActionAsset` groups actions | docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.InputAction | Input System 1.14.2 |
| C-095 | `PlayerInput` pairs actions with one player's devices | docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.PlayerInput | Input System 1.14.2 |
| C-096 | An `AudioMixer` asset has groups and snapshots | docs.unity3d.com/6000.3/Documentation/ScriptReference/Audio.AudioMixer | Unity 6000.3 |
| C-097 | `AudioSource.spatialBlend` 0 is 2D, 1 is fully 3D spatialised | docs.unity3d.com/6000.3/Documentation/ScriptReference/AudioSource-spatialBlend | Unity 6000.3 |
| C-132 | Runtime UI Toolkit code reaches the tree through `UIDocument.rootVisualElement` | docs.unity3d.com/6000.3/Documentation/ScriptReference/UIElements.UIDocument | Unity 6000.3 |
| C-133 | `Q<T>()` returns the first element matching the criteria, or null | docs.unity3d.com/6000.3/Documentation/ScriptReference/UIElements.UQueryExtensions.Q | Unity 6000.3 |
| C-134 | `VisualElement.UnregisterCallback` removes a callback from the element | docs.unity3d.com/6000.3/Documentation/ScriptReference/UIElements.VisualElement | Unity 6000.3 |
| C-135 | `TMP_Text.SetText` takes a format string with float arguments and writes the result without an intermediate string | docs.unity3d.com/Packages/com.unity.ugui@2.0/api/TMPro.TMP_Text | uGUI 2.0.0 |
| C-136 | `AudioSource.PlayOneShot` does not cancel clips already playing on the same source | docs.unity3d.com/6000.3/Documentation/ScriptReference/AudioSource.PlayOneShot | Unity 6000.3 |
| C-137 | `AudioMixer` exposes parameters whose value comes from the current snapshot or transition | docs.unity3d.com/6000.3/Documentation/ScriptReference/Audio.AudioMixer | Unity 6000.3 |
| C-138 | `AudioMixerSnapshot.TransitionTo` interpolates towards the snapshot over a time interval | docs.unity3d.com/6000.3/Documentation/ScriptReference/Audio.AudioMixerSnapshot | Unity 6000.3 |
| C-139 | AudioClip load types are Decompress On Load, Compressed In Memory and Streaming | docs.unity3d.com/6000.3/Documentation/Manual/class-AudioClip | Unity 6000.3 |
| C-140 | `SaveBindingOverridesAsJson` and `LoadBindingOverridesFromJson` round-trip binding overrides as JSON | docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.InputActionRebindingExtensions | Input System 1.14.2 |
| C-141 | `EnhancedTouch.Touch` keeps track of a touch over time | docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.EnhancedTouch.Touch | Input System 1.14.2 |
| C-207 | `StringTableCollection` groups the `StringTable` assets of one locale | docs.unity3d.com/Packages/com.unity.localization@1.5/api/UnityEngine.Localization.StringTableCollection | Localization 1.5.13 |
| C-208 | `InputActionAsset.SaveBindingOverridesAsJson` and `LoadBindingOverridesFromJson` round-trip the overrides of an asset | docs.unity3d.com/Packages/com.unity.inputsystem@1.14/api/UnityEngine.InputSystem.InputActionAsset | Input System 1.14.2 |
| C-213 | `PanelSettings` is the UI Toolkit asset a runtime panel binds to, and a `ThemeStyleSheet` supplies its default styles | docs.unity3d.com/6000.3/Documentation/ScriptReference/UIElements.PanelSettings | Unity 6000.3 |
| C-214 | `TMP_Text.SetText` has overloads that take a format string plus float arguments | docs.unity3d.com/Packages/com.unity.ugui@2.0/api/TMPro.TMP_Text | uGUI 2.0.0 |

## Testing, build, CI

Test framework and editor-side build facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-050 | EditMode and PlayMode tests are the two Unity Test Framework modes | docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index | UTF 1.4.6 |
| C-051 | Build Profiles replace the legacy single build-settings surface in Unity 6 | docs.unity3d.com/6000.3/Documentation/Manual/BuildSettings | Unity 6000.3 |
| C-052 | IL2CPP is the shippable scripting backend for major platforms | docs.unity3d.com/6000.3/Documentation/Manual/scripting-backends | Unity 6000.3 |
| C-053 | GameCI provides community GitHub actions for Unity build and test | game.ci/docs | GameCI 4.x |
| C-054 | The Unity CLI can drive a running Editor and run builds and tests | docs.unity.com/en-us/unity-cli | Unity CLI |
| C-098 | `[UnityTest]` runs as a coroutine in Play Mode | docs.unity3d.com/Packages/com.unity.test-framework@1.4/api/UnityEngine.TestTools.UnityTestAttribute | UTF 1.4.6 |
| C-099 | `BuildPipeline.BuildPlayer` builds a player programmatically | docs.unity3d.com/6000.3/Documentation/ScriptReference/BuildPipeline.BuildPlayer | Unity 6000.3 |
| C-100 | Mono is JIT; IL2CPP is Unity's AOT pipeline converting IL to C++ | docs.unity3d.com/6000.3/Documentation/Manual/scripting-backends | Unity 6000.3 |

## Editor and tooling

Editor state, editor API and CLI session facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-186 | `EditorApplication.isCompiling` reports whether the Editor is compiling scripts | docs.unity3d.com/6000.3/Documentation/ScriptReference/EditorApplication-isCompiling | Unity 6000.3 |
| C-187 | `EditorApplication.isUpdating` is true while the Editor is refreshing the AssetDatabase | docs.unity3d.com/6000.3/Documentation/ScriptReference/EditorApplication-isUpdating | Unity 6000.3 |
| C-188 | `EditorApplication.isPlaying` reports whether the Editor is in Play mode | docs.unity3d.com/6000.3/Documentation/ScriptReference/EditorApplication-isPlaying | Unity 6000.3 |
| C-189 | `EditorApplication.isPlayingOrWillChangePlaymode` is true in Play mode or just before entering it, and false when the Editor will exit | docs.unity3d.com/6000.3/Documentation/ScriptReference/EditorApplication-isPlayingOrWillChangePlaymode | Unity 6000.3 |
| C-190 | `EditorUtility.IsDirty` reports whether an object has changed since it was last saved | docs.unity3d.com/6000.3/Documentation/ScriptReference/EditorUtility.IsDirty | Unity 6000.3 |
| C-191 | `Scene.isDirty` returns true when the Scene is modified | docs.unity3d.com/6000.3/Documentation/ScriptReference/SceneManagement.Scene | Unity 6000.3 |
| C-192 | `AssetDatabase.GlobalArtifactDependencyVersion` changes during a refresh that invalidates artifacts; an unchanged value means the artifacts are still valid | docs.unity3d.com/6000.3/Documentation/ScriptReference/AssetDatabase.GlobalArtifactDependencyVersion | Unity 6000.3 |
| C-193 | `AssemblyReloadEvents.afterAssemblyReload` is dispatched just after Unity has reloaded all assemblies | docs.unity3d.com/6000.3/Documentation/ScriptReference/AssemblyReloadEvents-afterAssemblyReload | Unity 6000.3 |
| C-194 | `SceneManager.GetActiveScene` gets the currently active Scene | docs.unity3d.com/6000.3/Documentation/ScriptReference/SceneManagement.SceneManager.GetActiveScene | Unity 6000.3 |
| C-195 | `EditorSceneManager` extends `SceneManager` and exposes the loaded scenes through `GetSceneManagerSetup`, `GetSceneAt` and `GetSceneByPath` | docs.unity3d.com/6000.3/Documentation/ScriptReference/SceneManagement.EditorSceneManager | Unity 6000.3 |
| C-196 | The Unity CLI `status` command shows the live state of connected Editors: port, project path, version and process ID | docs.unity.com/en-us/unity-cli/unity-cli-reference | Unity CLI |

## Build, release & security

Build, release and platform-security facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-142 | The Build Profiles window has two types of profiles; platform profiles share settings across platforms | docs.unity3d.com/6000.3/Documentation/Manual/build-profiles | Unity 6000.3 |
| C-143 | Build callbacks include `IPreprocessBuildWithContext` at the start and `IPostprocessBuildWithContext` at the end | docs.unity3d.com/6000.3/Documentation/Manual/build-callbacks | Unity 6000.3 |
| C-144 | The Unity Test Framework runs from the command line with `-runTests -batchmode -projectPath -testResults -testPlatform` | docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/reference-command-line | UTF 1.4.6 |
| C-145 | The Unity Test Framework covers Edit Mode and Play Mode tests and runs on target platforms | docs.unity3d.com/Packages/com.unity.test-framework@1.4/manual/index | UTF 1.4.6 |
| C-146 | Managed code stripping analyses and marks code before stripping it, at the level you configure | docs.unity3d.com/6000.3/Documentation/Manual/managed-code-stripping | Unity 6000.3 |
| C-147 | Code that must survive managed stripping is preserved with attributes or a linker XML configuration file | docs.unity3d.com/6000.3/Documentation/Manual/managed-code-stripping | Unity 6000.3 |
| C-148 | With `-runTests`, the `-quit` argument makes the Editor quit before in-progress tests finish | docs.unity3d.com/6000.3/Documentation/Manual/EditorCommandLineArguments | Unity 6000.3 |
| C-149 | `Application.internetReachability` reports the network type, not actual connectivity | docs.unity3d.com/6000.3/Documentation/ScriptReference/Application-internetReachability | Unity 6000.3 |
| C-150 | `PlayerSettings.stripEngineCode` removes unused engine code from the build and is IL2CPP-only | docs.unity3d.com/6000.3/Documentation/ScriptReference/PlayerSettings | Unity 6000.3 |
| C-151 | `BuildPipeline.BuildPlayer` invalidates editor variables that reference GameObjects | docs.unity3d.com/6000.3/Documentation/ScriptReference/BuildPipeline.BuildPlayer | Unity 6000.3 |

## Netcode, security & platform

Multiplayer and local storage facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-101 | `NetworkVariable<T>` replicates a value and syncs it to clients | docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.1/api/Unity.Netcode.NetworkVariable-1 | NGO 2.1.1 |
| C-102 | `PlayerPrefs` is stored unencrypted in the platform registry, so it must not hold a secret | docs.unity3d.com/6000.3/Documentation/ScriptReference/PlayerPrefs | Unity 6000.3 |
| C-103 | Android signing keys are held in a keystore (Keystore Manager) | docs.unity3d.com/6000.3/Documentation/Manual/android-keystore | Unity 6000.3 |
| C-152 | A `NetworkObject` must be spawned by the network system to exist on clients | docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.1/api/Unity.Netcode.NetworkObject | NGO 2.1.1 |
| C-153 | `ClientRpcAttribute` marks a method as a Client RPC | docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.1/api/Unity.Netcode.ClientRpcAttribute | NGO 2.1.1 |
| C-154 | `NetworkManager.IsHost` reports whether the instance runs as host; `IsClient` and `IsServer` report the other roles | docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.1/api/Unity.Netcode.NetworkManager | NGO 2.1.1 |
| C-209 | `PlayerPrefs` stores its values on the device, in the platform's own storage, not in a project file | docs.unity3d.com/6000.3/Documentation/ScriptReference/PlayerPrefs | Unity 6000.3 |
| C-210 | `NetworkBehaviour` is the base component of a networked object | docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.1/api/Unity.Netcode.NetworkBehaviour | NGO 2.1.1 |

## Simulation & training

Learning-record and reporting facts.

| ID | Claim | Source | Verified against |
|---|---|---|---|
| C-060 | xAPI records learning statements to a Learning Record Store | adlnet.gov/projects/xapi | xAPI 1.0.3 |
| C-061 | Deterministic scoring requires logging discrete events, not rendered observations | adlnet.gov/projects/xapi | xAPI 1.0.3 |
| C-104 | An xAPI statement carries a required actor, a required verb and a required object | raw.githubusercontent.com/adlnet/xAPI-Spec/master/xAPI-Data.md | xAPI 1.0.3 |
| C-155 | An xAPI statement's result and context are optional | raw.githubusercontent.com/adlnet/xAPI-Spec/master/xAPI-Data.md | xAPI 1.0.3 |
| C-156 | A String Table returns a localized string for a key and a specific locale | docs.unity3d.com/Packages/com.unity.localization@1.5/manual/StringTables | Localization 1.5.13 |
| C-157 | `LocalizedString.StringChanged` notifies when the translated value changes; `GetLocalizedStringAsync` returns it | docs.unity3d.com/Packages/com.unity.localization@1.5/api/UnityEngine.Localization.LocalizedString | Localization 1.5.13 |
| C-211 | A SCORM 2004 package declares an objective and a completion status, and the LMS records both | adlnet.gov/projects/scorm | SCORM 2004 |
| C-212 | An xAPI statement is a JSON record holding the actor, the verb and the object | raw.githubusercontent.com/adlnet/xAPI-Spec/master/xAPI-Data.md | xAPI 1.0.3 |

## How to use a claim

Cite the ID (`see C-023`) rather than restating the statement. If a needed claim is absent, do not assert it: verify against the primary source first, then add a row here.

## Adding a claim

Required fields: ID, claim, source, verified-against. The source must be a primary document you actually resolved — a `docs.unity3d.com` manual, ScriptReference or package page, or the official spec — not a blog. The verified-against column names the version read (`Unity 6000.3`, `URP 17.0.4`). A claim with no source is not asserted anywhere: verify it, then add the row. The id comes from the block that matches the subject area (see **Id allocation** above), and the source and the verified-against value must agree with each other. The size budget is a guard against fluff, not a quota: keep every row that a skill would otherwise have to assert uncited, and cut wording, not coverage.