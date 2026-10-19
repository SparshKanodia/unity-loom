# Workflow — XR (AR / VR / MR)

Owner domain: [loom-xr](../skills/loom-xr/SKILL.md).
Precondition: [foundation](foundation.md) is done; the mode is chosen.
Template: [docs/07-workflow-template.md](../docs/07-workflow-template.md).

One dialect only: [references/xr-dialect.md](../references/xr-dialect.md) owns
the naming, the collider matrix and the lifecycle names.

## When to use

- A headset or a handheld AR device has been chosen as a target.
- The OpenXR loader, the feature groups and the interaction profiles are not
  configured yet.
- The rig, the interactors or the collider matrix must be built.
- An AR scenario needs its session, its managers, its placement and its
  anchors.
- A passthrough experience needs the room data and the privacy rules.
- A comfort model must be chosen and then verified with a tester.

## When not to use

- A request about a flat screen game with no headset -> [foundation](foundation.md).
- A request about a world-space interface inside a headset -> [ui-audio](ui-audio.md).
- A request about the render path, the post stack or the tiers ->
  [graphics](graphics.md).
- A request about frame time, allocation or overdraw on the headset ->
  [performance](performance.md).
- A request about a training procedure with a score -> [simulation](simulation.md).
- A request about packaging, the store or the privacy declaration ->
  [release](release.md).

## Before you start

- Detect the tier and state it; plan the fallback before the first asset
  edit ([doctrine/02-capabilities.md](../doctrine/02-capabilities.md)).
- At T0 the phases below are file edits and editor scripts; device sessions
  are handed over.
- Pick the track and record it in `docs/xr-decision.md`.
- The comfort defaults have one owner: ADR-0006 in
  [docs/03-decision-records.md](../docs/03-decision-records.md). This
  workflow applies them; it never restates or re-decides them.

`docs/xr-decision.md` is a document of the user's project, not of this
repository. The prologue creates it. If it is missing when the prologue
needs it, that is a blocker to clear, not a broken link.

## Steps

### Prologue — shared by every track

#### P1. Platform and package pinning

- [ ] Pin the editor and package versions; commit the lock file.
- [ ] Record the target devices in the decision file.
- **Gate:** the lock file matches the installed editor.

#### P2. Feature groups and interaction profiles

- [ ] Enable the OpenXR loader per platform, the feature groups and the
      interaction profile of every shipped controller (C-126, C-127, C-128).
- **Gate:** no target device lacks a profile.

#### P3. Rig assembly

- [ ] Build one rig prefab: tracking space, camera offset, devices (C-022).
- [ ] Keep the rig, manager and actions in one assembly definition.
- **Gate:** the rig validates and the build starts with it.

#### P4. Project validation

- [ ] Run the validation from the CLI after each package change.
- [ ] Fix every error it reports before building.
- **Gate:** the output has no error line.

#### P5. Stereo and rendering path

- [ ] Set single-pass instanced rendering for every target (C-020).
- [ ] Choose the renderer path per track: desktop and PC VR use the desktop
      renderer path; mobile and standalone XR use the mobile renderer path
      with the device texture format (C-043).
- **Gate:** one stereo pass, and both eyes show the shader.

#### P6. Comfort baseline

- [ ] Apply the comfort defaults of ADR-0006 to the locomotion provider and
      to the comfort menu: the turn type, the turn angle, the vignette, the
      height and the recenter (C-027).
- [ ] Never move the head or body; the world moves instead.
- [ ] Expose every comfort setting in the menu, and make each one change a
      behaviour that a tester can observe.
- **Gate:** every comfort setting changes a behaviour.

### Track A — VR

#### A1. Rig, interactors and the collider matrix

- [ ] Add the interaction manager and an interactor set per hand.
- [ ] Near-far for a hand that points and grabs (C-079), direct for a poke (C-123), ray for a distant target (C-124).
- [ ] Give every interactor its own interaction layer mask (C-081).
- [ ] Apply the collider matrix in the dialect file; test it (C-023).
- [ ] Add the XR UI input module and the tracked-device raycaster for in-headset screens (C-083, C-125).
- **Gate:** the rig validates and the collider test passes.

#### A2. Locomotion and comfort

- [ ] Add the teleport provider and the snap turn provider to the comfort
      menu, and the vignette (C-082), using the defaults of ADR-0006.
- [ ] Give the teleport area a surface, anchor and reticle.
- **Gate:** the defaults match the comfort decision record.

#### A3. Hands and input

- [ ] Support controllers and hands where the device offers both (C-128).
- [ ] Allow a mid-session source change and remapping.
- [ ] After any Meta XR SDK upgrade, re-verify controller tracking on the device (C-029).
- **Gate:** the remapping survives a restart.

#### A4. Resume and focus

- [ ] Run the resume procedure from the dialect file on focus regain.
- [ ] Guard it to run once per event; cancel in-flight actions.
- **Gate:** after the system menu, the input still works.

#### A5. Interaction lifecycle and feedback

- [ ] Implement every phase of the dialect lifecycle per object and
      record the hold behaviour next to the prefab.
- [ ] Give every interaction a visual, audio and haptic response; a set
      that covers only some of the three is a defect.
- [ ] Route the feedback through the interactor event path, not through a
      direct call on the device.
- **Gate:** the full interaction cycle raises no error, and the table
  below has one row per phase with its evidence.

| Phase | Evidence |
|---|---|
| Hover | a log line with the interactable id |
| Select | a log line with the event name |
| Hold | a log line with the hold mode (C-080, C-122) |
| Release | a log line with the release velocity |
| Despawn | no exception in the log |

The behaviour of each phase, and the hold movement types, are defined in
[references/xr-dialect.md](../references/xr-dialect.md) and are not repeated
here.

#### A6. Device session soak

- [ ] Run the device session soak of the epilogue on the floor device, over
      every interactable in the scene.
- **Gate:** the session holds the frame rate.

### Track B — AR

#### B1. Session and provider

- [ ] Add the AR session, the rig and the camera manager (C-084, C-130).
- [ ] Enable the provider plug-in per target platform (C-024).
- [ ] Start on demand, stop in the background.
- **Gate:** the feed renders and tracking initializes.

#### B2. AR manager set

- [ ] Add only the managers the scenario needs, from the table below; the
      trackables come through the manager components (C-025), so a manager
      that stays in the scene keeps its cost.
- [ ] Subscribe in start, unsubscribe in the teardown.
- **Gate:** the scene lists exactly the needed managers, and no manager
  raises an event after teardown.

Project default - tune against the tracking cost in the device capture.

| Manager | Add it when the scenario needs | Cost if left in |
|---|---|---|
| Plane tracking | placement on a real surface | a tracking pass per frame |
| Anchor tracking | placed content must stay put (C-131) | a tracking pass per frame |
| Tracked image | a marker or a printed target | a frame capture per frame |
| Face tracking | a face is a target | a face pass per frame |
| Mesh tracking | occlusion by the real room | a mesh pass per frame |
| Body tracking | the user is tracked in the body | a body pass per frame |

#### B3. Placement and anchoring

- [ ] Raycast the allowed trackable type; show a matching reticle.
- [ ] Place on a hit and attach an anchor (C-026, C-131).
- [ ] Hide the reticle when nothing is tracked; show the reason.
- **Gate:** the content stays anchored while the device moves.

#### B4. Light estimation and occlusion

- [ ] Apply the light estimation; fall back to a fixed ambient.
- [ ] Use the depth occlusion only within the platform range.
- [ ] Budget it and recalibrate on foreground.
- **Gate:** the content is lit like the room.

#### B5. Failure triage

- [ ] Triage against the table before changing code.
- **Gate:** every row has a recorded resolution.

| Symptom | Likely cause | Check first |
|---|---|---|
| Black screen | Session/camera not running, provider not enabled, permission denied | Session state (C-129), plug-in enabled, permissions, rig present |
| Camera jitter | Multi-threaded rendering with the provider | Disable MT rendering or update the provider |
| Image library fails to build | Reference images invalid or provider mismatch | Image settings, ARCore requires/optional flags |
| Image tracking stops updating | Tracked-image manager lifecycle | Manager enabled, event subscription, provider version |
| Crash on scene switch | Session/camera lifetime across scenes | Keep the session alive; do not destroy the rig |
| Occlusion stops far away | Depth range limit of the platform | Reduce reliance on far depth; use meshes near the user |
| Build fails (Xcode/Play) | Signing, provider, API level, bundle format | API level, ARM64, IL2CPP, provider version |
| Placement on a ghost surface | The plane trackable is still initializing | Wait for the plane to be classified |
| Content drifts from its spot | The anchor was never attached or was lost | Anchor state (C-131), re-anchor on loss |
| Tracking stops after a call | The session resumed without a state check | Session state, re-initialize the session |

#### B6. Device matrix

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

#### B7. Permission, unsupported and background states

- [ ] Permission denied: an explanatory screen, a retry, no camera access
      after the denial and no prompt in the launch path.
- [ ] Unsupported device: a clear message, a non-camera route.
- [ ] On background, stop the session; on return, re-anchor and pause
      the simulation clock.
- **Gate:** both states have their own screen.

### Track C — MR

#### C1. Passthrough and room data

- [ ] Enable passthrough with the world, quad and interface layers, in an
      explicit order.
- [ ] Load the room data (C-028), expose the floor, wall and furniture
      surfaces, and cache it once per session.
- **Gate:** the layers are in the intended order.

#### C2. World-locked content at 1:1 scale

- [ ] Author the content at the real size and world-lock it.
- [ ] Anchor it to the room and keep the light estimation applied.
- **Gate:** the content stays locked across a walk around it.

#### C3. Anchors and depth occlusion

- [ ] Anchor every world-locked object (C-026), re-anchor on loss, and
      release the anchors when the content is despawned.
- [ ] Use the environment depth only within the measured range.
- [ ] Cap the cost per tier; fall back to a plane or a mesh.
- **Gate:** no world-locked object survives without an anchor.

#### C4. Colocated multi-user

- [ ] Share the room and anchor data; a late joiner gets the room and
      the anchors, not a replay.
- [ ] Sync the tracked pose and the discrete events only. Read the session
      role from `NetworkManager.IsHost`, `IsClient` or `IsServer` (C-154);
      the authority model is a project decision and belongs in the decision
      file.
- **Gate:** two clients agree on the world.

#### C5. Privacy gate

- [ ] Treat the room mesh, the camera feed and the anchors as personal
      data; apply [doctrine/01-safety.md](../doctrine/01-safety.md)
      before any of them leaves the device.
- [ ] Log the counts only, never the room data or the frames, and state
      the purpose and the retention by the consent.
- **Gate:** the consent screen names the data and the purpose.

### Epilogue — shared by every track

#### E1. Performance soak

- [ ] Soak on the floor device for the duration set in the project target
      table; twenty minutes is the floor, not the target.
- [ ] Record the frame time, allocation and memory.
- **Gate:** the allocation is zero and the frame rate holds.

#### E2. Comfort verification

- [ ] Run the comfort checklist with a tester who has not built the app.
- [ ] Check the vignette, turn type and recenter are reachable.
- **Gate:** the tester reports no discomfort.

#### E3. Store and device requirements

- [ ] Check the store requirement list: package, privacy, ratings.
- [ ] Verify the build on every device in the matrix.
- **Gate:** every device passes and the manifest is filed.

## Limitations

- The XR workflow does not cover the frame budget itself; the numbers come
  from [performance](performance.md) and this workflow only records them.
- It does not author the interface, even the one that floats in the
  headset; [ui-audio](ui-audio.md) owns that.
- It does not own the render path, the post stack or the quality tiers;
  [graphics](graphics.md) owns those.
- It does not cover hand-occlusion authoring, hand mesh quality or the
  custom gesture set; those need a device and an artist.
- It does not own the store declaration, the age rating or the privacy
  form; [release](release.md) owns those.
- The comfort model has one owner, ADR-0006. This workflow applies it and
  verifies it; it never decides a new one, and a project that needs a
  different model writes its own decision record.
- The soak proves that a device holds a frame rate for a set duration. It
  cannot prove comfort, and a tester who built the app is not a tester.
- The device matrix grows one row at a time. A device class that nobody has
  tested is not supported, only unknown.

## If a step fails

1. Stop at the failing gate; keep the last good rig, session or anchor
   state.
2. Revert the change that broke it: `git revert <sha>`, or restore the rig
   prefab, the session setup or the manager set from the last good commit.
3. Re-run the project validation from the CLI and re-read its output, and
   re-run the triage table for the symptom, before touching more code.
4. Re-read the phase gate and re-run the device check that failed.
5. If the fix needs a physical headset, a provider account, a signing
   identity or a human comfort tester, emit a `HUMAN HANDOFF` block with
   What, Why, Steps and Verify, and stop.
6. If the same gate fails twice, write a deviation record: the gate, the
   reason, who accepted it and the date.

## Done when

- [ ] VR: the rig validates, the collider test passes, the resume procedure
      works after a system menu, and a long session holds the frame rate; the
      validation output, the collider test result and the device log are
      archived.
- [ ] AR: the session and provider run on a device, only the needed
      managers load, the content stays anchored, and every triage row has a
      resolution; the device log and the matrix file are archived.
- [ ] MR: the layers are in order, the room data loads, the content is
      world-locked at real size, and the privacy gate holds; the consent
      record names the data and the purpose.
- [ ] All tracks: the prologue gates pass, the soak, comfort and device
      checks are recorded, and the manifest is filed; the comfort tester
      reports no discomfort.
