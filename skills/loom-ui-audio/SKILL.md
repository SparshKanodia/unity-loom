---
name: loom-ui-audio
description: "Unity UI and audio: UI Toolkit (UXML/USS), uGUI canvas, TextMeshPro text, HUD and menus, input actions and rebinding, localization, AudioMixer routing, spatial audio, SFX pooling and music. Use for interface, input, text, localization or sound work."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: ui-audio
  tier: 5
  triggers: ["ui toolkit", "uxml", "uss", "ugui", "canvas", "textmeshpro", "tmp", "hud", "menu ui", "audio mixer", "sound", "sfx", "music", "spatial audio", "localization", "input system", "rebinding", "gamepad", "touch controls", "accessibility"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.ui 2.x", "com.unity.inputsystem 1.11", "com.unity.localization 1.x", "com.unity.textmeshpro 3.x"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/UIElements.html", "docs.unity3d.com/Packages/com.unity.inputsystem"]
---

# loom-ui-audio — UI, Input & Audio

Work [workflows/ui-audio.md](../../workflows/ui-audio.md). API facts live in [references/claims.md](../../references/claims.md).

## Decision tree

- **Runtime UI?** → UI Toolkit for menus, HUD and panels; uGUI for world-space UI, XR and existing uGUI screens. Migrate one screen at a time; never interleave both on one screen.
- **Authored or code-built?** → UXML + USS when designers edit structure or skin; code trees only for procedural content.
- **Canvas space?** → Screen Space Overlay by default; Screen Space Camera only for a shared post stack or world position.
- **Which text?** → `TextMeshProUGUI` in uGUI; plain `TextMeshPro` only for 3D world labels.
- **2D or 3D sound?** → 2D for UI, music and voice; 3D with a blend curve for world emitters.
- **Volume scope?** → mixer groups for master/music/sfx/ui/vo; per-object volume for one emitter only.
- **Input?** → an action map with named control schemes; never poll the legacy `Input` class.
- **Text content?** → localization tables from the first screen; no user-facing literal anywhere.

## Setup defaults

| Area | Default |
|---|---|
| UI Toolkit theme | one theme, one font asset per family, size and colour variables on the root |
| uGUI canvas | `CanvasScaler` in `Scale With Screen Size`, reference resolution from the design target |
| uGUI sprites | one atlas per UI set, point filtering, no compression |
| TextMeshPro | one font asset per family, dynamic atlas, fallback chain for CJK, TMP sprite asset for emoji |
| Event system | one `EventSystem` with the Input System UI module, never two |
| Input actions | one `InputActionAsset`, one map per context, one control scheme per device family |
| Rebinding | interactive rebind per action, per-device exclusions, override JSON outside the repo |
| Parity | keyboard, mouse, gamepad and touch drive the same actions |
| Mixer groups | Master with Music, SFX, UI, VO children; ducking by snapshot |
| Spatial audio | 3D blend and custom rolloff on world emitters; `AudioListener` on the camera rig |
| Localization | one `StringTableCollection` per locale, `LocalizedString` in the view, keys in code |
| Accessibility | font scale 0.8–2.0, 4.5:1 contrast, icon plus text, subtitles, remapping, reduced-flash |

## Idiomatic examples

### UI Toolkit panel from UXML, with a localized label

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
        var root = document.rootVisualElement;
        _resume = root.Q<Button>("resume");
        _objective = root.Q<Label>("objective");
        _resume.clicked += OnResumeClicked;
        objective.StringChanged += OnText;
        objective.GetLocalizedStringAsync().Completed += op => OnText(op.Result);
    }
    void OnDisable()
    {
        _resume.clicked -= OnResumeClicked;
        objective.StringChanged -= OnText;
    }
    void OnText(string value) { if (value != null) _objective.text = value; }
    void OnResumeClicked() => gameObject.SetActive(false);
}
```

### uGUI list that recycles rows

Rows are authored in the scene; nothing is instantiated while scrolling.

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
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
        label.SetText(item.Name, item.Quantity);   // no intermediate string
        icon.sprite = item.Icon;
    }
}
```

### Pooled SFX and snapshot ducking

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
        src.PlayOneShot(clips[clipIndex], volume);
    }
}
public sealed class MusicDucker : MonoBehaviour
{
    [SerializeField] AudioMixer mixer;
    [SerializeField] AudioMixerSnapshot[] ducked, clear;
    public void Duck() => mixer.TransitionToSnapshots(ducked, 0.35f);
    public void Unduck() => mixer.TransitionToSnapshots(clear, 0.8f);
}
```

### Rebinding one action

```csharp
using UnityEngine;
using UnityEngine.InputSystem;
public sealed class RebindSlot : MonoBehaviour
{
    [SerializeField] InputActionReference action;
    [SerializeField] int bindingIndex = -1;
    public void StartRebind()
    {
        action.action.Disable();
        action.action.PerformInteractiveRebinding(bindingIndex)
               .WithControlsExcluding("<Keyboard>")
               .OnCancelOperation(_ => Persist())
               .Start();
    }
    void Persist() => PlayerPrefs.SetString("bindings", action.asset.SaveBindingOverridesAsJson());
}
```

Reload the saved override on the same asset at startup with the load-from-JSON call.

## Red lines

- No string rebuilt per frame; use the TMP set-text overloads (C-045).
- No `Instantiate` or `Destroy` per list row or per frame.
- No uGUI and UI Toolkit interleaved on one screen without a written reason.
- No clip decompressed per shot: set the import load type once per type.
- No `AudioSource` per effect without a pool.
- No colour-only signalling: every state also carries text or an icon.
- No unmapped control: every action has a binding, a rebind and a device.
- No hard-coded user-facing string in a scene, UXML, USS or script.
- No legacy `Input` polling in a project that uses the new Input System.

## Verify

- Profiler GC column shows no allocation while scrolling the longest list and none per frame from text.
- Every screen renders without clipping at the smallest and largest aspect ratio and font scale.
- Every mixer group responds to its own control, and the ducking snapshot is audible and reversible.
- Every action rebinds, the override survives a restart, and the scheme matches the device.
- A contrast pass and a colour-only pass on each screen, plus a screen-reader order check.

## Handoff

- World-space UI inside a headset → [../loom-xr/SKILL.md](../loom-xr/SKILL.md).
- Frame time, GC and draw calls caused by UI → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- Input mapping inside a training procedure → [../loom-simulation/SKILL.md](../loom-simulation/SKILL.md).
- Device builds, store review, privacy disclosure → [../loom-release/SKILL.md](../loom-release/SKILL.md).
