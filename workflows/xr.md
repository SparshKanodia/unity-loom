# Workflow — XR (AR / VR / MR)

Owner domain: [loom-xr](../skills/loom-xr/SKILL.md).
Precondition: [foundation](foundation.md) is done; the mode is chosen.

One dialect only: [references/xr-dialect.md](../references/xr-dialect.md) owns
the naming, the collider matrix and the lifecycle names.

## Before you start

- Detect the tier and state it; plan the fallback before the first asset
  edit ([doctrine/02-capabilities.md](../doctrine/02-capabilities.md)).
- At T0 the phases below are file edits and editor scripts; device sessions
  are handed over.
- Pick the track and record it in `docs/xr-decision.md`.

## Prologue — shared by every track

### P1. Platform and package pinning

- [ ] Pin the editor and package versions; commit the lock file.
- [ ] Record the target devices in the decision file.
- **Gate:** the lock file matches the installed editor.

### P2. Feature groups and interaction profiles

- [ ] Enable the OpenXR loader per platform, the feature groups and the
      interaction profile of every shipped controller.
- **Gate:** no target device lacks a profile.

### P3. Rig assembly

- [ ] Build one rig prefab: tracking space, camera offset, devices.
- [ ] Keep the rig, manager and actions in one assembly definition.
- **Gate:** the rig validates and the build starts with it.

### P4. Project validation

- [ ] Run the validation from the CLI after each package change.
- [ ] Fix every error it reports before building.
- **Gate:** the output has no error line.

### P5. Stereo and rendering path

- [ ] Set single-pass instanced rendering for every target (C-020).
- [ ] Use the mobile renderer path and the device texture (C-043).
- **Gate:** one stereo pass, and both eyes show the shader.

### P6. Comfort baseline

- [ ] Teleport primary, snap turn, vignette on, smooth motion off.
- [ ] Never move the head or body; the world moves instead.
- [ ] Menu: turn type, angle, vignette, height, recenter.
- **Gate:** every comfort setting changes a behaviour.

## Track A — VR

### A1. Rig, interactors and the collider matrix

- [ ] Add the interaction manager and an interactor set per hand.
- [ ] Near-far for a hand that points and grabs, direct for a poke.
- [ ] Apply the collider matrix in the dialect file; test it.
- **Gate:** the rig validates and the collider test passes.

### A2. Locomotion and comfort

- [ ] Add teleport, snap turn and the vignette to the comfort menu.
- [ ] Give the teleport area a surface, anchor and reticle.
- **Gate:** the defaults match the comfort decision record.

### A3. Hands and input

- [ ] Support controllers and hands where the device offers both.
- [ ] Allow a mid-session source change and remapping.
- **Gate:** the remapping survives a restart.

### A4. Resume and focus

- [ ] Run the resume procedure from the dialect file on focus regain.
- [ ] Guard it to run once per event; cancel in-flight actions.
- **Gate:** after the system menu, the input still works.

### A5. Interaction lifecycle and feedback

- [ ] Implement every phase of the dialect lifecycle per object and
      record the hold behaviour next to the prefab.
- [ ] Give every interaction a visual, audio and haptic response; a set
      that covers only some of the three is a defect.
- [ ] Route the feedback through the interactor event path, not through a
      direct call on the device.
- **Gate:** the full interaction cycle raises no error, and the table
  below has one row per phase with its evidence.

| Phase | What must be observable | Evidence |
|---|---|---|
| Hover | the highlight changes and the optional haptic tick fires | a log line with the interactable id |
| Select | the object is held and the feedback fires | a log line with the event name |
| Hold | the object moves by the chosen behaviour | a log line with the hold mode |
| Release | the object is free, the parenting is cleared and the throw setting applies | a log line with the release velocity |
| Despawn | the references are dropped and the object is unregistered | no exception in the log |

### A6. Device session soak

- [ ] Soak twenty minutes on the floor device over every object.
- [ ] Record the frame time, allocation and thermal state.
- **Gate:** the session holds the frame rate.

## Track B — AR

### B1. Session and provider

- [ ] Add the AR session, the rig and the camera manager.
- [ ] Enable the provider plug-in per target platform (C-024).
- [ ] Start on demand, stop in the background.
- **Gate:** the feed renders and tracking initializes.

### B2. AR manager set

- [ ] Add only the managers the scenario needs, from the table below;
      every unused manager costs a tracking pass per frame.
- [ ] Subscribe in start, unsubscribe in the teardown.
- **Gate:** the scene lists exactly the needed managers, and no manager
  raises an event after teardown.

| Manager | Add it when the scenario needs | Cost if unused |
|---|---|---|
| Plane tracking | placement on a real surface | a tracking pass per frame |
| Anchor tracking | placed content must stay put | a tracking pass per frame |
| Tracked image | a marker or a printed target | a frame capture per frame |
| Face tracking | a face is a target | a face pass per frame |
| Mesh tracking | occlusion by the real room | a mesh pass per frame |
| Body tracking | the user is tracked in the body | a body pass per frame |

### B3. Placement and anchoring

- [ ] Raycast the allowed trackable type; show a matching reticle.
- [ ] Place on a hit and attach an anchor (C-026).
- [ ] Hide the reticle when nothing is tracked; show the reason.
- **Gate:** the content stays anchored while the device moves.

### B4. Light estimation and occlusion

- [ ] Apply the light estimation; fall back to a fixed ambient.
- [ ] Use the depth occlusion only within the platform range.
- [ ] Budget it and recalibrate on foreground.
- **Gate:** the content is lit like the room.

### B5. Failure triage

- [ ] Triage against the table before changing code.
- **Gate:** every row has a recorded resolution.

| Symptom | Likely cause | Check first |
|---|---|---|
| Black screen | Session/camera not running, provider not enabled, permission denied | Session state, plug-in enabled, permissions, rig present |
| Camera jitter | Multi-threaded rendering with the provider | Disable MT rendering or update the provider |
| Image library fails to build | Reference images invalid or provider mismatch | Image settings, ARCore requires/optional flags |
| Image tracking stops updating | Tracked-image manager lifecycle | Manager enabled, event subscription, provider version |
| Crash on scene switch | Session/camera lifetime across scenes | Keep the session alive; do not destroy the rig |
| Occlusion stops far away | Depth range limit of the platform | Reduce reliance on far depth; use meshes near the user |
| Build fails (Xcode/Play) | Signing, provider, API level, bundle format | API level, ARM64, IL2CPP, provider version |
| Placement on a ghost surface | The plane trackable is still initializing | Wait for the plane to be classified |
| Content drifts from its spot | The anchor was never attached or was lost | Anchor state, re-anchor on loss |
| Tracking stops after a call | The session resumed without a state check | Session state, re-initialize the session |

### B6. Device matrix

- [ ] Run the scenario once per row; record it in the matrix file.
- [ ] Add a device as soon as a user has an unseen one.
- **Gate:** every row of the matrix has a recorded result.

| Device class | Lighting | Surface | Expected behaviour |
|---|---|---|---|
| Depth-capable | bright | textured | accurate placement and occlusion |
| Depth-capable | dim | blank | plane found, occlusion from the mesh |
| Without depth | bright | textured | placement works, no depth occlusion |
| Without depth | dim | blank | placement may fail; show the reason |
| Headset pass-through | any | any | session and tracking behave like a phone run |

### B7. Permission, unsupported and background states

- [ ] Permission denied: an explanatory screen, a retry, no camera access
      after the denial and no prompt in the launch path.
- [ ] Unsupported device: a clear message, a non-camera route.
- [ ] On background, stop the session; on return, re-anchor and pause
      the simulation clock.
- **Gate:** both states have their own screen.

## Track C — MR

### C1. Passthrough and room data

- [ ] Enable passthrough with the world, quad and interface layers, in an
      explicit order.
- [ ] Load the room data (C-028), expose the floor, wall and furniture
      surfaces, and cache it once per session.
- **Gate:** the layers are in the intended order.

### C2. World-locked content at 1:1 scale

- [ ] Author the content at the real size and world-lock it.
- [ ] Anchor it to the room and keep the light estimation applied.
- **Gate:** the content stays locked across a walk around it.

### C3. Anchors and depth occlusion

- [ ] Anchor every world-locked object (C-026), re-anchor on loss, and
      release the anchors when the content is despawned.
- [ ] Use the environment depth only within the measured range.
- [ ] Cap the cost per tier; fall back to a plane or a mesh.
- **Gate:** no world-locked object survives without an anchor.

### C4. Colocated multi-user

- [ ] Share the room and anchor data; a late joiner gets the room and
      the anchors, not a replay.
- [ ] Sync the tracked pose and the discrete events only, and keep the
      session logic host-authoritative.
- **Gate:** two clients agree on the world.

### C5. Privacy gate

- [ ] Treat the room mesh, the camera feed and the anchors as personal
      data; apply [doctrine/01-safety.md](../doctrine/01-safety.md)
      before any of them leaves the device.
- [ ] Log the counts only, never the room data or the frames, and state
      the purpose and the retention by the consent.
- **Gate:** the consent screen names the data and the purpose.

## Epilogue — shared by every track

### E1. Performance soak

- [ ] Soak twenty minutes on the floor device with the headset warm.
- [ ] Record the frame time, allocation and memory.
- **Gate:** the allocation is zero and the frame rate holds.

### E2. Comfort verification

- [ ] Run the comfort checklist with a tester who has not built the app.
- [ ] Check the vignette, turn type and recenter are reachable.
- **Gate:** the tester reports no discomfort.

### E3. Store and device requirements

- [ ] Check the store requirement list: package, privacy, ratings.
- [ ] Verify the build on every device in the matrix.
- **Gate:** every device passes and the manifest is filed.

## Handoff

- Frame time, allocation or overdraw → [performance](performance.md).
- An interface inside the headset → [ui-audio](ui-audio.md).
- A training procedure → [simulation](simulation.md); a store →
  [release](release.md).

## Done when

- VR: the rig validates, the collider test passes, the resume procedure
  works after a system menu, and a long session holds the frame rate.
- AR: the session and provider run on a device, only the needed
  managers load, the content stays anchored, and every triage row has a
  resolution.
- MR: the layers are in order, the room data loads, the content is
  world-locked at real size, and the privacy gate holds.
- All tracks: the prologue gates pass, the soak, comfort and device
  checks are recorded, and the manifest is filed.
