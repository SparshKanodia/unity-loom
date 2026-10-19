---
name: loom-ui-audio
description: "Use for Unity interface, input and audio work: UI Toolkit with UXML and USS, uGUI canvases, TextMeshPro text, HUD and menus, input actions and rebinding, localization, AudioMixer routing, spatial audio, pooled effects and music. Apply it to any interface, input, text, localization or sound task."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: ui-audio
  tier: 5
  triggers: ["ui toolkit", "uxml", "uss", "ugui", "canvas", "textmeshpro", "tmp", "hud", "menu ui", "audio mixer", "sound", "sfx", "music", "spatial audio", "localization", "input system", "rebinding", "gamepad", "touch controls", "accessibility"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.ui 2.x", "com.unity.inputsystem 1.11", "com.unity.localization 1.x", "com.unity.textmeshpro 3.x"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/UIElements.html", "docs.unity3d.com/Packages/com.unity.inputsystem"]
---

# loom-ui-audio — UI, Input & Audio

Work [workflows/ui-audio.md](../../workflows/ui-audio.md). API facts live in
[references/claims.md](../../references/claims.md).

## When to use

- A menu, a HUD, a settings screen or a panel has to be built.
- Text has to be localized, or the font stack is undecided.
- The input actions, the control schemes or the rebinding screen are open.
- The mixer, the snapshots or the voice budget have to be decided.
- A screen allocates every frame, or a sound cuts out under load.

## When not to use

- A question about Unity itself rather than a change -> stay in the router,
  [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- The render pipeline, the interface materials or the font atlas packing ->
  [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- A world-space interface inside a headset ->
  [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Sprites, tilemaps or pixel art -> [../loom-2d/SKILL.md](../loom-2d/SKILL.md).
- A training procedure, a score or a learning record ->
  [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).
- A frame-time or memory problem caused elsewhere ->
  [../loom-performance/SKILL.md](../loom-performance/SKILL.md).

## Pick the approach

| Question | Choose |
|---|---|
| Runtime interface | UI Toolkit for menus, HUD, panels and settings (C-093); uGUI only for a world-space overlay in XR and in 3D |
| Authored or code-built | UXML and USS when designers edit structure or skin (C-093); code trees only for procedural content |
| Canvas space | Screen Space Overlay by default; Screen Space Camera only for a shared post stack or a world position |
| Which text | `TextMeshProUGUI` in uGUI; plain `TextMeshPro` only for 3D world labels |
| 2D or 3D sound | 2D for interface, music and voice; 3D with a blend curve for world emitters (C-097) |
| Volume scope | the mixer groups Master, Music, SFX, Voice and UI (C-096); per-object volume for one emitter only |
| Input | an action map with named control schemes (C-094), and `PlayerInput` for the devices of one player (C-095) |
| Text content | localization tables from the first screen (C-207); no user-facing literal anywhere |

Migrate one screen at a time; never interleave UI Toolkit and uGUI on one
screen.

## Setup defaults

| Area | Default | Evidence |
|---|---|---|
| UI Toolkit theme | one theme and one font asset per family, with the size and colour variables on the root | C-213, Project default - tune against the screen set |
| uGUI canvas | `CanvasScaler` in `Scale With Screen Size`, with the reference resolution of the design target | Project default - tune against the design target |
| uGUI sprites | one atlas per interface set, point filtering, no compression | C-088, Project default - tune against the interface set |
| TextMeshPro | one font asset per family, dynamic atlas, a fallback chain for CJK, a TMP sprite asset for emoji | C-045, Project default - tune against the glyph coverage |
| Event system | one `EventSystem` with the Input System UI module, never two | Project default - tune against the input devices |
| Input actions | one `InputActionAsset`, one map per context, one control scheme per device family | C-094 |
| Rebinding | interactive rebind per action, with per-device exclusions | C-140 |
| Binding overrides | the override JSON in `PlayerPrefs` on the device; never in the repository and never as a project asset | C-140, C-208, C-209 |
| Parity | keyboard, mouse, gamepad and touch drive the same actions | Project default - tune against the device list |
| Mixer groups | Master, Music, SFX, Voice and UI, with ducking by snapshot | C-096, C-138 |
| Spatial audio | a 3D blend and a custom rolloff on world emitters | C-097, Project default - tune against the world emitters |
| Localization | one `StringTableCollection` per locale, which groups the `StringTable` assets of that locale | C-207 |
| Accessibility | a text scale, a contrast floor, an icon beside every colour cue, subtitles, remapping and a reduced-flash option | Project default - tune against the accessibility checklist |

## Examples

UI Toolkit panel from UXML, with a localized label. A `PanelSettings` asset
is what a runtime panel binds to, and a `ThemeStyleSheet` supplies the
default styles (C-213).

```csharp
using UnityEngine;
using UnityEngine.UIElements;
using UnityEngine.Localization;
public sealed class PausePanel : MonoBehaviour
{
    [SerializeField] UIDocument document;
    [SerializeField] LocalizedString objective;
    Button _resume; Label _objective;
    void OnEnable()
    {
        var root = document.rootVisualElement;      // C-132
        _resume = root.Q<Button>("resume");         // C-133
        _objective = root.Q<Label>("objective");    // C-133
        _resume.clicked += OnResumeClicked;
        root.RegisterCallback<ChangeEvent<float>>(OnSliderChanged);   // C-134
        objective.StringChanged += OnText;           // C-157
        objective.GetLocalizedStringAsync().Completed += op => OnText(op.Result);   // C-157
    }
    void OnDisable()
    {
        _resume.clicked -= OnResumeClicked;
        document.rootVisualElement.UnregisterCallback<ChangeEvent<float>>(OnSliderChanged);   // C-134
        objective.StringChanged -= OnText;
    }
    void OnSliderChanged(ChangeEvent<float> e) { }
    void OnText(string value) { if (value != null) _objective.text = value; }
    void OnResumeClicked() => gameObject.SetActive(false);
}
```

uGUI list that recycles rows. The rows are authored in the scene; nothing is
instantiated while scrolling.

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
public struct Item
{
    public string Format;    // a format string, for example "{0} / {1}"
    public float Quantity;
    public float Capacity;
    public Sprite Icon;
}
public sealed class InventoryList : MonoBehaviour
{
    [SerializeField] ItemRow[] rows;
    public void Bind(Item[] items)
    {
        for (int i = 0; i < rows.Length; i++)
        {
            bool visible = i < items.Length;
            rows[i].gameObject.SetActive(visible);
            if (visible) rows[i].Bind(items[i]);
        }
    }
}
public sealed class ItemRow : MonoBehaviour
{
    [SerializeField] TMP_Text label;
    [SerializeField] Image icon;
    public void Bind(Item item)
    {
        label.SetText(item.Format, item.Quantity, item.Capacity);   // C-045, C-214
        icon.sprite = item.Icon;
    }
}
```

Pooled effects and snapshot ducking.

```csharp
using UnityEngine;
using UnityEngine.Audio;
public sealed class SfxPlayer : MonoBehaviour
{
    [SerializeField] AudioSource[] sources = new AudioSource[16];
    [SerializeField] AudioClip[] clips;
    int _next;
    public void Play(int clipIndex, float volume = 1f)
    {
        var src = sources[_next];
        _next = (_next + 1) % sources.Length;
        src.PlayOneShot(clips[clipIndex], volume);   // does not cancel the clip already playing (C-136)
    }
}
public sealed class MusicDucker : MonoBehaviour
{
    [SerializeField] AudioMixer mixer;
    [SerializeField] AudioMixerSnapshot[] ducked, clear;
    public void Duck() => mixer.TransitionToSnapshots(ducked, 0.35f);   // C-138
    public void Unduck() => mixer.TransitionToSnapshots(clear, 0.8f);  // C-138
}
```

Rebinding one action. The override JSON lives in `PlayerPrefs`, which is
stored on the device and is not encrypted (C-209), so it holds no secret.

```csharp
using UnityEngine;
using UnityEngine.InputSystem;
public sealed class RebindSlot : MonoBehaviour
{
    [SerializeField] InputActionReference action;
    [SerializeField] int bindingIndex = -1;
    const string Key = "input.bindings";
    void OnEnable()
    {
        var json = PlayerPrefs.GetString(Key, string.Empty);
        if (!string.IsNullOrEmpty(json))
            action.asset.LoadBindingOverridesFromJson(json);   // C-140, C-208
    }
    public void StartRebind()
    {
        action.action.Disable();
        action.action.PerformInteractiveRebinding(bindingIndex)
               .WithControlsExcluding("<Keyboard>")
               .OnCancelOperation(_ => Persist())
               .Start();
    }
    void Persist() => PlayerPrefs.SetString(Key, action.asset.SaveBindingOverridesAsJson());   // C-140
}
```

Persist a completed rebind with the same call as the cancelled one.

## Red lines

- No string rebuilt per frame; use the TMP set-text overloads (C-045, C-135).
- No `Instantiate` or `Destroy` per list row or per frame.
- No uGUI and UI Toolkit interleaved on one screen without a written reason.
- No clip decompressed per shot: set the import load type once per type (C-139).
- No `AudioSource` per effect without a pool (C-136).
- No colour-only signalling: every state also carries text or an icon.
- No unmapped control: every action has a binding, a rebind and a device (C-094).
- No hard-coded user-facing string in a scene, UXML, USS or script.
- No legacy `Input` polling in a project that uses the new Input System.
- No binding override in the repository, and none as a project asset: it
  belongs in `PlayerPrefs` on the device (C-140).
- No mixer group outside the five: Master, Music, SFX, Voice and UI.

## Verify

- A profiler capture shows no allocation while scrolling the longest list, and none per frame from text.
- Every screen renders without clipping at the smallest and the largest aspect ratio and font scale.
- Every mixer group responds to its own control, and the ducking snapshot is audible and reversible.
- Every action rebinds, the override survives a restart, and the scheme matches the device.
- A contrast pass and a colour-only pass on each screen, plus a screen-reader order check.
- The `Done when` gate of [workflows/ui-audio.md](../../workflows/ui-audio.md) passes.

## Handoff

- World-space interface inside a headset -> [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Frame time, GC and draw calls caused by the interface -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Input mapping inside a training procedure -> [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).
- Device builds, store review, privacy disclosure -> [../loom-release/SKILL.md](../loom-release/SKILL.md).
