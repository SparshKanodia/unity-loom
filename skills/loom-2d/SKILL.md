---
name: loom-2d
description: "Unity 2D development: sprites and import settings, sprite atlases, tilemaps and rule tiles, pixel-perfect cameras, 2D physics and colliders, 2D lighting and sorting. Use for platformers, top-down games, pixel art, or any 2D rendering and physics problem."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: 2d
  tier: 2
  triggers: ["2d", "sprite", "sprite atlas", "tilemap", "rule tile", "pixel perfect", "light2d", "collider2d", "rigidbody2d", "2d physics"]
  budget: { lines: 320, bytes: 14000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.2d.* 6.x", "com.unity.render-pipelines.universal 17.x"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/Unity2D.html", "docs.unity3d.com/Packages/com.unity.2d.tilemap.extras"]
---

# loom-2d — 2D Development

Work [workflows/2d.md](../../workflows/2d.md) in order. API facts live in [references/claims.md](../../references/claims.md).

## Pick the approach

| Need | Choose | Default |
|---|---|---|
| Many sprites in one scene | Sprite Atlas | one atlas per scene or character (C-088) |
| Repeating grid geometry | Tilemap | visual tilemap plus a separate collision tilemap (C-089) |
| Still art | Static sprite | renderer only, no script |
| Moving art | Animated sprite | Animator clip, or a code-driven sprite swap |
| Player or camera-controlled motion | Kinematic Rigidbody2D | `MovePosition` with interpolation |
| Pushed, thrown or stacked | Dynamic Rigidbody2D | physics drives it, interpolation on |
| Level geometry | No Rigidbody2D | collider only, or a composite collider (C-090) |
| Scene lighting | Baked lightmap | `Light2D` only where it is dynamic and budgeted |
| Panels and frames | 9-slice sprite | sliced sprite, never stretched art |

Symptom → move:

- Blurry or jittering art → constant PPU, point filter, no compression, integer zoom, camera snapped to the grid (C-113).
- Too many draw calls → one atlas per scene, same-atlas sprites adjacent, confirm in the frame debugger.
- Greedy collision → separate visual and collision tilemaps, merged into one `CompositeCollider2D` (C-090), no rigidbody on static tiles.
- Falls through at speed → continuous detection on the fast body, or raycast movement.
- Detection → `Physics2D.OverlapCircle` (C-120) through the non-alloc form, with a reused buffer (C-004).

## Setup defaults

Encode these in an `AssetPostprocessor` so they are reproducible.

| Setting | Value | Where |
|---|---|---|
| Pixels per unit | one project constant, matched by the camera | importer |
| Filter mode | Point for pixel art, Bilinear otherwise | importer |
| Compression | none for pixel art, platform format otherwise (C-043) | per platform |
| Sprite mode, mesh type | Single + Full Rect for pixel art, Multiple + Tight otherwise | importer |
| Sprite atlas | one per scene or character, variants for palette swaps | `com.unity.2d.sprite` (C-088) |
| Tilemap chunk size | 16 on the 2D Renderer asset | URP 2D Renderer (C-089) |
| Collision geometry | separate collision tilemap merged by a `CompositeCollider2D` | scene (C-090) |
| Rigidbody2D type | Dynamic pushed, Kinematic moved, none for level geometry | component |
| Pixel perfect | `PixelPerfectCamera`, assetsPPU equal to sprite PPU | URP (C-113) |
| Sorting | one sorting layer per role, order in layer for detail | settings |
| Batching | same atlas, same material, adjacent order | frame debugger |

## Examples

Custom rule tile — pick the sprite from the neighbours. `RuleTile` comes from
the 2D Tilemap package you already have installed; the `extras` package adds
`RuleOverrideTile`, `AdvancedRuleOverrideTile` and `AutoTile` (C-111).
Confirm the package name against your own `Packages/manifest.json` before
referencing the type.
```csharp
[CreateAssetMenu(fileName = "BridgeTile", menuName = "Tiles/Bridge")]
public sealed class BridgeTile : RuleTile
{
    [SerializeField] private Sprite m_BridgeSprite;
    public override void GetTileData(Vector3Int position, ITilemap tilemap, ref TileData tileData)
    {
        base.GetTileData(position, tilemap, ref tileData);
        bool supported = tilemap.GetTile(position + Vector3Int.down) != null;
        tileData.sprite = supported ? m_BridgeSprite : m_DefaultSprite;
    }
}
```

Character controller — cached body, kinematic move, interpolation on.
```csharp
[RequireComponent(typeof(Rigidbody2D))]
public sealed class PlayerController2D : MonoBehaviour
{
    [SerializeField] private float m_Speed = 6f;
    private Rigidbody2D m_Body;
    private Vector2 m_Move;
    private void Awake()
    {
        m_Body = GetComponent<Rigidbody2D>();            // cached once (C-006)
        m_Body.bodyType = RigidbodyType2D.Kinematic;
        m_Body.interpolation = RigidbodyInterpolation2D.Interpolate;
    }
    private void Update()
    {
        var pad = Gamepad.current;
        Vector2 dir = pad != null ? pad.leftStick.ReadValue() : Vector2.zero;
        m_Move = Vector2.ClampMagnitude(dir, 1f);
    }
    private void FixedUpdate()
    {
        m_Body.MovePosition(m_Body.position + m_Move * (m_Speed * Time.fixedDeltaTime));
    }
}
```

Tilemap query — `Tilemap.GetTile` is an instance method, so resolve the component once and reuse it (C-112).
```csharp
public sealed class TileQuery : MonoBehaviour
{
    private Tilemap m_Tilemap;
    private readonly TileBase[] m_Block = new TileBase[64];
    private void Awake() => m_Tilemap = GetComponent<Tilemap>();
    public TileBase GetTile(Vector3Int cell) => m_Tilemap.GetTile(cell);
    public Vector3 CellToLocal(Vector3Int cell) => m_Tilemap.CellToLocal(cell);
    public int GetBlock(Vector3Int origin, Vector3Int size)
    {
        return m_Tilemap.GetTilesBlockNonAlloc(new BoundsInt(origin, size), m_Block);
    }
}
```

Sprite atlas load and release — the handle is released exactly once.
```csharp
private AsyncOperationHandle<SpriteAtlas> m_Handle;
public void Load(string key)
{
    m_Handle = Addressables.LoadAssetAsync<SpriteAtlas>(key);
    m_Handle.Completed += OnLoaded;
}
private void OnLoaded(AsyncOperationHandle<SpriteAtlas> handle)
{
    if (handle.Status != AsyncOperationStatus.Succeeded)
        Debug.LogError($"atlas load failed: {handle.OperationException?.Message}");
}
private void OnDestroy()
{
    if (m_Handle.IsValid())
        Addressables.Release(m_Handle);
}
```

Runtime sprite — `Sprite.Create` builds a Sprite at runtime (C-114); it never replaces an atlas.

Pixel perfect — `PixelPerfectCamera` keeps pixel art crisp and stable at different resolutions (C-113). Set `assetsPPU` to the sprite PPU, the reference resolution to the art size, and pixel snapping on.

## Red lines

- No per-frame `GetComponent`, `Find*` or `Camera.main` (C-002, C-006).
- No per-frame string concatenation, formatting or interpolation.
- No 2D lighting without a light budget and a normal map per material.
- No per-platform compression left at the default (C-043).
- No 3D colliders or rigidbodies in a 2D scene.
- No `Rigidbody2D` on a moving object without interpolation enabled.
- No `Rigidbody2D` on static level geometry, and no per-sprite textures mixed with atlases.
- No allocating physics query; use the results-array overloads (C-004).

## Verify

- The profiler shows no GC allocation per frame in steady-state gameplay.
- Art is crisp at 720p, 1080p and 1440p, and does not shimmer while moving.
- The frame debugger shows one batch for the tilemap and one per atlas.
- Physics is deterministic: the same input sequence gives the same result.
- A build on the floor platform runs at the target frame rate.
- `Done when` in [workflows/2d.md](../../workflows/2d.md) is met.

## Handoff

- Frame budget, draw calls, GC → [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- HUD, menus and text → [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- 2D shaders and URP setup → [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Atlases, save data, asset loading → [../loom-project/SKILL.md](../loom-project/SKILL.md).
- Target builds and device checks → [../loom-release/SKILL.md](../loom-release/SKILL.md).
