# XR Dialect (The One We Use)

Upstream XR examples use three different API generations. To avoid hallucinated code, Unity Loom ships **one** dialect. Read this before writing XR code.

Primary stack: **Unity 6 LTS + URP + XRI 3.x + AR Foundation 6.x + OpenXR**.

This file fixes **names only**. Setup and comfort rules: [skills/loom-xr/SKILL.md](../skills/loom-xr/SKILL.md); sequence: [workflows/xr.md](../workflows/xr.md); decision: [ADR-0005](../docs/03-decision-records.md). Facts cited as `C-0xx` in [claims.md](claims.md).

## Naming: use / avoid

| Intent | Use (current) | Avoid (deprecated or hallucinated) | Why |
|---|---|---|---|
| Interaction manager | `XRInteractionManager` | `InteractionManager`, `XRInteractorManager` | one manager |
| Interactors | `XRDirectInteractor`, `XRRayInteractor`, `XRPokeInteractor`, `XRSocketInteractor`, `XRNearFarInteractor` | `GrabInteractor`, `RayInteractor`, `FingerInteractor`, `SocketInteractor`, `NearFarInteractor` | renamed in 2.0/3.x |
| Interactor line | `XRInteractorLineVisual` (visual only) | `XRInteractorLineRenderer` | not an interactor |
| Interactables | `XRBaseInteractable`, `XRGrabInteractable`, `XRSimpleInteractable` | `XRInteractable`, `XRGrabable`, `XRButton` | base, grab, select |
| Hold movement type | `MovementType`: `VelocityTracking`, `Kinematic`, `Instantaneous` | `MotionType`, `ThrowType` | renamed in 2.0 |
| Interaction events | `selectEntered`, `selectExited`, `activateEntered`, `hoverEntered` | `OnSelectEntered`, `OnSelectExited`, `OnGrab`, `OnRelease` | see C-021 |
| Rig | `XROrigin` (XR Core Utilities 2.x) | `ARSessionOrigin`, hand-rolled rig | see C-022 |
| Rig camera | `XROrigin.Camera`, `XROriginCamera` | `Camera.main` as rig source | see C-002 |
| Camera yaw/offset/height | `XROrigin.CameraYaw`, `.CameraOffset`, `.CameraHeight` | manual rig math | the origin owns it |
| Tracked pose driver | `UnityEngine.InputSystem.XR.TrackedPoseDriver` | legacy `UnityEngine.XR.TrackedPoseDriver` struct | Input System type |
| Device types | `UnityEngine.InputSystem.XR` (`XRController`, `TrackedDevice`) | `UnityEngine.XR.InputDevices` | legacy namespace |
| Device enumeration | `XRInputSubsystem` | `InputTracking.GetNodeStates` | legacy API |
| Pose data | tracked-device poses from the Input System | `InputTracking.GetLocalPosition`, `TrackedDevicePose` struct | legacy `UnityEngine.XR` |
| Haptics | haptics of the Input System XR device (verify namespace at runtime) | `controller.vibrate()` | no such method |
| Interaction layers | `InteractionLayerMask` | physics `LayerMask` substitute | masks do not filter |
| UI input | `XRUIInputModule`, `TrackedDeviceGraphicRaycaster`, `TrackedDeviceEventHandler` | `StandaloneInputModule`, `TrackedDeviceRaycaster` (1.x), bare `GraphicRaycaster` | renamed in 2.0 |
| Teleport | `TeleportationProvider` with `TeleportationArea` / `TeleportationAnchor` | `TeleportProvider`, `XRTeleportProvider` | named `Teleportation…` |
| Move and turn | `ActionBasedContinuousMoveProvider`, `ActionBasedSnapTurnProvider`, `ActionBasedContinuousTurnProvider` | `SmoothLocomotionProvider`, `SnapTurnLocomotionProvider`, `SmoothTurnProvider` | suffix `…Provider` |
| Climbing | `ClimbProvider` with `ClimbInteractable` (verify at runtime) | custom hand-over-hand physics | an XRI locomotion pair |
| Hands | `XRHand`, `XRHandJointID`, `XRHandSkeletonDriver` (XR Hands 1.7) | `OVRHand`, `HandTrackingManager`, `OculusHandSubsystem` | vendor SDK types; there is no `XRHandSkeleton` class |
| AR session and camera | `ARSession`, `ARCameraManager` | manual background render, ad-hoc camera | they own it |
| AR trackers | `ARPlaneManager`, `ARAnchorManager`, `ARTrackedImageManager`, `ARFaceManager`, `ARMeshManager` | provider-native tracker calls | see C-025 |
| AR anchors | `ARAnchor` from `ARAnchorManager` | `XRAnchor`, `XRAnchorManager` | no `XRAnchor` in ARF 6.x |
| AR config and occlusion | `ARWorldTrackingConfiguration`, `AROcclusionManager` | `ARSessionConfiguration` (1.x), depth shaders | replaced in ARF 3.x |
| AR provider | ARCore / ARKit plug-in in XR Plug-in Management | `ARCoreSession` used directly | see C-024 |
| OpenXR | `OpenXRLoader`, `OpenXRSettings`, `OpenXRFeature`, `OpenXRInteractionFeature` | `OculusLoader`, `OVRManager`, `OpenXRLoaderFeature` | one loader per target |
| XR settings | `XRGeneralSettings` | `XRSettings.enabled`, `XRSettings.device` | legacy `UnityEngine.XR` |
| MR room data | Meta MR Utility Kit (MRUK) | hand-rolled room scan | see C-028 |
| visionOS | PolySpatial with the visionOS XR Plug-in | ARKit tricks inside Unity | see C-030 |

## The interaction lifecycle

Model these five transitions; most XR bugs come from omitting one. The contract is in [skills/loom-xr/SKILL.md](../skills/loom-xr/SKILL.md).

1. **Hover** — highlight; optional haptic tick.
2. **Select** — grab/activate with visual + audio + haptic feedback.
3. **Hold** — pick the movement type deliberately (table below).
4. **Release** — restore physics, clear parent, apply the throw setting.
5. **Destroy/despawn** — drop references, never destroy while selected, unregister from the manager.

`XRGrabInteractable.movementType` is the only place the hold type is chosen.

| Object class | Movement type | Why |
|---|---|---|
| Throwable (ball, grenade, prop) | `VelocityTracking` | momentum is the point |
| Tool (wrench, driver, held device) | `Kinematic` | stays under the hand; no drift |
| Heavy crate (too big to swing) | `Instantaneous` | jumps to the grip; no momentum |
| UI handle (slider knob, panel grip) | `Instantaneous` | precision beats physicality |

`VelocityTracking` needs a Rigidbody; the other two do not. Never switch mid-grab.

## Resume procedure

System menus and pauses commonly stop input. On focus regain, work these steps in order.

| # | Action | State to re-read | Observable proof |
|---|---|---|---|
| 1 | Re-enable interactors | `XRBaseInteractor.enabled` | the hand cursor or ray returns |
| 2 | Re-register with the manager | the interactor list of `XRInteractionManager` | the manager lists it again |
| 3 | Re-read tracked devices | the `XRInputSubsystem` device list | a fresh pose arrives |
| 4 | Re-assert hover/select state | the hover and select lists of `XRBaseInteractable` | nothing is stuck hovering |
| 5 | Verify by selecting a test object | the select events of the interactable | visual + audio + haptic feedback fires |

## Collider matrix

| Component | Collider | Trigger | Layer | Size / shape | Notes |
|---|---|---|---|---|---|
| `XRDirectInteractor` | required on the interactor | yes | hand layer | sphere 0.1–0.25 | see C-023 |
| `XRPokeInteractor` | required on the interactable | yes | poking hand layer | fingertip sized | trigger contacts |
| `XRRayInteractor` | none | — | aiming hand layer | — | hits the target collider; `XRInteractorLineVisual` draws the `LineRenderer` |
| `XRSocketInteractor` | required on the interactor | yes | hand layer | sphere 0.1–0.3 | target is a separate attach point |
| `XRGrabInteractable` | required | no | reach layer | box or convex mesh + Rigidbody | see C-023, C-041 |
| `XRSimpleInteractable` | required | no | reach layer | box | no Rigidbody |
| `XRHoverInteractable` (verify at runtime) | required | no | reach layer | box | hover-only |
| `TrackedDeviceGraphicRaycaster` | none | — | UI layer | — | raycasts graphics only |
| `TeleportationArea` | required | yes | locomotion layer | mesh or box | reacts to trigger enters |
| `TeleportationAnchor` | required | no | locomotion layer | thin box | fixed destination |

## Compatibility appendix (older LTS)

Only if a project cannot move off an older LTS. Map names; do not duplicate examples.

| Current (Unity 6 / XRI 3.x / ARF 6.x) | Unity 2022.3 LTS / XRI 2.x / ARF 5.x |
|---|---|
| `XRNearFarInteractor` | `NearFarInteractor` (examples repo) |
| `UnityEngine.InputSystem.XR.XRController` | `UnityEngine.XR.Interaction.Toolkit.Inputs.XRController` |
| `TrackedDeviceGraphicRaycaster` | `TrackedDeviceRaycaster` (1.x only) |
| `XROrigin` in AR Foundation | `XROrigin` (ARF 5.x); `ARSessionOrigin` in ARF 4.x |
| `selectEntered` / `selectExited` | `OnSelectEntered` / `OnSelectExited` |
| `XRInteractionManager`, `InteractionLayerMask`, `XRSimpleInteractable`, `XRPokeInteractor`, `ActionBased*Provider` | same in 2.x |
| `ARAnchor`, `ARAnchorManager`, `ARWorldTrackingConfiguration` | same in ARF 5.x |
| `XRGeneralSettings` | `XRGeneralSettings` (`XRSettings` pre-2021) |

Old-LTS code is ported forward.

## OpenXR feature groups and interaction profiles

Feature groups and profiles are set per build target in XR Plug-in Management. The names below are the stable ones; anything else (hand-tracking groups, eye gaze, room-scale features) must be **discovered at runtime in XR Plug-in Management**, not assumed. `OpenXRInteractionFeature` subclasses are what the profiles add; an unsupported profile fails at runtime, not at build time.

| Platform | Feature groups to enable | Interaction profiles |
|---|---|---|
| Standalone (PCVR) | OpenXR loader; optional hand tracking, eye gaze, gamepad | `Oculus Touch Controller Profile`, `Valve Index Controller Profile`, `HTC Vive Controller Profile` |
| Android / Quest | Meta Quest group; hand tracking and gamepad groups as supported | `Oculus Touch Controller Profile`, `Microsoft Hand Interaction Profile` |
| iOS / visionOS | visionOS XR Plug-in with PolySpatial (see C-030) | `Apple Touch Controller Profile`; visionOS hand-tracking profile — discover at runtime |
| AR mobile | AR provider plug-in, ARCore or ARKit (see C-024) | none; AR has no controller profiles |

## Platform notes

| Platform | Notes |
|---|---|
| Quest | single-pass instanced (C-020), Vulkan, ASTC (C-043); controllers **and** hands; remap inputs; an SDK upgrade can break tracking (C-029) |
| OpenXR on desktop | one loader, several profiles; hand tracking optional, so keep a controller fallback |
| visionOS / PolySpatial | world-locked content only, 1:1 scale, no unanchored content (C-030) |
| AR mobile | provider plug-in in XR Plug-in Management (C-024); LiDAR devices give planes and depth, non-LiDAR ones do not; light estimation optional; occlusion depth range limited |
| MR / passthrough | composition layers, room data (C-028), world-lock and anchor content (C-026) |

Comfort defaults: [skills/loom-xr/SKILL.md](../skills/loom-xr/SKILL.md) and [ADR-0006](../docs/03-decision-records.md).

## Hallucination guard

APIs agents invent most often in XR, and the construct to use instead.

| Invented API | Why it is wrong | Use instead |
|---|---|---|
| `OnSelectEntered` / `OnSelectExited`, `OnGrab` / `OnRelease` | handlers became events in 2.0 | `selectEntered` / `selectExited` (C-021) |
| `ARSessionOrigin` | replaced in ARF 5.x | `XROrigin` (C-022) |
| `InteractionManager`, `XRInteractorManager` | wrong or missing | `XRInteractionManager` |
| `UnityEngine.XR.InputDevices` | legacy namespace | `UnityEngine.InputSystem.XR` |
| `XRSettings.enabled` / `XRSettings.device` | legacy settings API | `XRGeneralSettings`, `OpenXRSettings` |
| `InputTracking.GetLocalPosition`, `TrackedDevicePose` (legacy struct) | legacy `UnityEngine.XR` types | Input System tracked poses |
| `Camera.main` driving the rig | tagged-search camera, wrong transform | `XROrigin.Camera` (C-002) |
| `controller.vibrate()` | no such method on XR controllers | Input System XR haptics |
| `XRAnchor` / `XRAnchorManager` | no such types in ARF 6.x | `ARAnchor` from `ARAnchorManager` (C-025) |
| `SmoothLocomotionProvider`, `SnapTurnLocomotionProvider`, `TeleportProvider` | not shipped names | `ActionBased*Provider`, `TeleportationProvider` |
| `OVRManager` / `OculusLoader` | legacy Meta SDK path | `OpenXRLoader` with Meta groups |

## Verification

- The rig validates with no errors.
- Each interaction fires visible, audible and haptic feedback on device.
- Pause/resume leaves input working.
- Custom shaders render correctly in both eyes.

| Mode | Signal |
|---|---|
| VR | rig validation is error-free; both eyes render (C-020) |
| VR | a select gives visual, audio **and** haptic feedback on device, and still fires after a system-menu pause and resume |
| VR | comfort settings change behaviour; smooth move stays opt-in (C-027) |
| VR | frame time holds 20+ minutes, no GC spikes in XR hot paths |
| AR | placed content stays anchored while walking and after resume (C-026) |
| AR | permission-denied, unsupported-device, tracking-lost are handled |
| MR | content stays world-locked, 1:1 scale, consistent lighting |

Runtime evidence must come from a device build plus a log or profiler capture.
