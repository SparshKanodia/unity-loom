# Workflow — UI and Audio

Owner domain: [loom-ui-audio](../skills/loom-ui-audio/SKILL.md).
Precondition: [foundation](foundation.md) is done.

## Before you start

- Detect the capability tier and state it; plan the fallback before the
  first asset edit
  ([doctrine/02-capabilities.md](../doctrine/02-capabilities.md)).
- At T0 the phases below are file edits and editor scripts; a screenshot
  or a device check is handed over explicitly.
- The UI system, the font stack and the audio routing are decided once
  and written into `docs/ui-audio-decision.md`.
- Version-specific statements carry a claim id from
  [references/claims.md](../references/claims.md).
- Preconditions: the platforms, the floor device and the supported
  aspect ratios are named; the action asset and the mixer asset exist
  or are created below; the target languages and their writing
  direction are named.

## Phase 1 — UI framework, theme and scale

- [ ] Choose the UI system: UI Toolkit for menus, HUD and settings (C-093),
      uGUI for a world-space overlay, and never both on one canvas. Record
      the reason in the decision file, and keep the view state in a view
      model: the view never computes game rules.
- [ ] Create one panel settings asset holding the reference resolution,
      the scale mode and the texture size.
- [ ] Create a theme sheet with the shared variables: spacing, radii,
      colours, type scale and durations. No screen hard-codes a colour.
- [ ] Load the theme as the default style sheet of the runtime panel,
      so every screen inherits it.
- [ ] Define the font stack: the primary font asset, the fallback chain
      and the sizes the scale slider reaches.
- **Gate:** a runtime panel renders with the theme applied, and a second
  screen reuses the variables without editing a value.

### UI-to-system ownership

| Concern | Owner | Rule |
|---|---|---|
| Focus and selection | the runtime panel focus controller | one focus owner per open screen |
| Navigation | the input action map | actions drive navigation, never raw device events |
| Safe area and cutouts | a single safe-area service | the interface reads insets, it never queries the device |
| Glyphs and atlases | the text mesh provider | one dynamic atlas per font |
| Master volume | the audio mixer | one exposed parameter, read by the mixer (C-137) |
| Tracked pointer in a headset | the XR input module | see the dialect file for the world case |

## Phase 2 — Layout and assets

- [ ] Write the layout so it scales from the smallest to the largest
      supported aspect ratio: anchor the root, size panels in percentage
      or in reference units, never in fixed pixels.
- [ ] Put every spacing and size value in the theme variables, then
      check the extremes.
- [ ] Set the import settings of each sprite class once and apply them
      to the folder: slice the nine-slices and the rounded shapes at
      import, so no runtime slicing is needed, and pack the interface
      sprites into atlases with one atlas adjacent in the draw order
      (C-088).
- [ ] Recycle the items of long lists; a thousand-row list must
      allocate only the visible rows.
- **Gate:** the layout is clean at the smallest and the largest supported
  aspect ratio, and the profiler shows no allocation while scrolling.

## Phase 3 — Text and localization

- [ ] Import the primary font as a font asset with a dynamic atlas and a
      fallback chain of the fonts that cover the missing scripts.
- [ ] Add the script coverage each target language needs; a missing
      glyph shows as a box and is a release blocker. A right-to-left
      language mirrors the layout from the language, not per screen.
- [ ] Move every user-facing string into a string table (C-156); no literal
      string reaches a label.
- [ ] Run a pseudo-localization pass that expands every string and
      exposes clipping and missing layout space.
- [ ] Use the set-text overloads for values that change every frame, so
      no string is built per frame (C-045, C-135).
- **Gate:** every string resolves in every target language, the
  pseudo-localization pass shows no clipped text, and the profiler shows
  no per-frame string allocation.

## Phase 4 — Input

- [ ] Define the action asset: one action map per context, with a
      control scheme for keyboard and mouse, gamepad, touch and, when
      relevant, a tracked device (C-094).
- [ ] Map every action to the schemes that can drive it; an action with
      no gamepad binding is a defect, not a preference.
- [ ] Build the rebinding screen on the same action asset and save the
      binding to the user profile as a serialized asset (C-140).
- [ ] Give the interface an explicit focus order and a visible focus
      ring, and let the navigation actions move the focus. Keep the
      input consumption in one place, so a screen and the gameplay do
      not read the same action in the same frame, and check that a device
      disconnected mid-session does not leave the interface pressed.
- **Gate:** every action fires from every scheme it claims, the rebinding
  survives a restart, and the focus order is complete on every screen.

## Phase 5 — Accessibility pass

- [ ] Run the checklist below and record the evidence for each row in
      `docs/ui-audio-accessibility.md`.
- [ ] Offer a text-scale setting that changes the type scale, and verify
      the largest scale on every screen.
- [ ] Offer a high-contrast theme and a reduced-motion setting that
      shortens or removes transitions.
- [ ] Never encode meaning in colour alone; pair every colour cue with
      a shape, an icon or a label. Turn on subtitles for speech and for
      the important sound cues, and let the subtitle size follow the
      text-scale setting.
- [ ] Keep the focus order aligned with the visual order, and make the
      interface usable with a gamepad and remapped controls.
- **Gate:** every row of the checklist has evidence attached, and the
  gamepad-only pass completes a full flow without a mouse.

### Accessibility checklist

| Requirement | Implementation | Evidence |
|---|---|---|
| Text scaling | a type scale variable and a settings entry | a screenshot at the largest scale |
| Contrast | a high-contrast theme variant | the contrast values in the theme |
| Colour independence | a shape or label beside every colour cue | a screenshot in greyscale |
| Subtitles | a subtitle track for speech and cues | a recording of a cue with it |
| Reduced motion | transitions shortened or removed | a recording of the transition |
| Focus order | an explicit order per screen | a recording of a keyboard walk |

## Phase 6 — Audio graph

- [ ] Create the mixer with the groups Master, Music, SFX, Voice and UI,
      and route every source through a group. No source plays direct
      (C-096).
- [ ] Create the snapshots that change the mix: pause, dialogue, combat,
      underwater and the menu state, each with its own values (C-096).
- [ ] Implement the ducking from one group to another with a snapshot,
      and record the depth and the release time in the decision file
      (C-138).
- [ ] Apply the 2D and 3D rules below to every source: the interface,
      the music and the repeated feedback stay 2D, the world effects,
      the tools and the vehicles are 3D (C-097).
- [ ] Set the load type of every clip by class: stream the long ones,
      decompress the short ones on load, and cap the simultaneous voices
      per group with pooled sources (C-139).
- [ ] Mark the loop points of every music clip and fade at the loop
      seam; set the compression and the priority per clip class, so a
      burst of effects never clips.
- **Gate:** the mixer routes every source, the snapshots produce the
  intended mix, and a burst of the worst-case effect set produces no
  clipping in the recorded output.

### Audio budget

| Class | Group | Load type | Max voices | Rule |
|---|---|---|---|---|
| Music | Music | stream | 2 | loop points set, crossfade at the seam |
| Voice or dialogue | Voice | stream | 1 | priority above effects |
| Long effect | SFX | compressed in memory | 8 | pooled |
| Short effect | SFX | decompress on load | 24 | pooled, per-class cap |
| Interface | UI | decompress on load | 8 | never spatialized |

The three load types in that table are the ones the importer offers: Decompress On Load, Compressed In Memory and Streaming (C-139).

## Phase 7 — Verification

- [ ] Re-run the layout check at the smallest and the largest supported
      aspect ratio after every layout change, and profile the interface
      in a busy scene for the allocation per frame and the draw-call
      count.
- [ ] Trigger every action from every control scheme on the floor device,
      play a scripted burst of the worst-case effect set, and record the
      result and the peak level.
- **Gate:** the verification record lists every screen, every action and
  every audio class, with no open item.

## Handoff

- Interface cost, draw calls or allocation → [performance](performance.md).
- A world-space interface inside a headset → [xr](xr.md).
- Interface materials and the pipeline → [graphics](graphics.md); the
  actions of a training procedure → [simulation](simulation.md).

## Done when

- The UI system, the theme, the font stack and the mixer groups are in
  the decision file.
- Every screen scales between the smallest and the largest supported
  aspect ratio with no clipping, and the theme variables are the only
  source of colour and spacing.
- Long lists recycle their items, and the profiler shows no per-frame
  allocation from the interface or the text.
- Every string resolves in every target language, the pseudo-localization
  pass is clean, and the right-to-left screens mirror correctly.
- Every action fires from every control scheme, the rebinding survives a
  restart, and the focus order is complete on every screen. The
  accessibility checklist has evidence for every row.
- Every source routes through the mixer, the snapshots and the ducking
  work, the budgets hold, and the worst-case burst does not clip.
