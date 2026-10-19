---
name: loom-2d
description: "Use for Unity 2D work: sprite import settings and atlases, tilemaps and rule tiles, pixel-perfect cameras, 2D physics and colliders, 2D lighting and sorting. Apply it to platformers, top-down games, pixel art and any 2D rendering or physics problem."
allowed-tools: Read, Grep, Glob, Write, Edit
metadata:
  loom: 1
  domain: 2d
  tier: 2
  triggers: ["2d", "sprite", "sprite atlas", "tilemap", "rule tile", "pixel perfect", "light2d", "collider2d", "rigidbody2d", "2d physics"]
  budget: { lines: 340, bytes: 16000 }
  verified-against: ["Unity 6000.3 LTS", "com.unity.2d.* 6.x", "com.unity.render-pipelines.universal 17.x"]
  sources: ["docs.unity3d.com/6000.3/Documentation/Manual/Unity2D.html", "docs.unity3d.com/Packages/com.unity.2d.tilemap.extras"]
---

# loom-2d — 2D Development

Work [workflows/2d.md](../../workflows/2d.md) in order. API facts live in
[references/claims.md](../../references/claims.md).

## When to use

- Sprites are imported and the sprite mode, mesh type or filter is open.
- A sprite sheet is packed, or the atlas plan is undecided.
- A tilemap level is authored and the chunking or the collider setup is open.
- A 2D body needs a body type, a material or a layer.
- 2D lighting, sorting layers or the pixel-perfect camera need a policy.

## When not to use

- A 3D project that uses a few 2D sprites -> [../loom-3d/SKILL.md](../loom-3d/SKILL.md)
  and [../../workflows/3d.md](../../workflows/3d.md).
- A question about Unity itself rather than a change -> stay in the router,
  [../unity-loom/SKILL.md](../unity-loom/SKILL.md).
- Menus, HUD, text or audio routing ->
  [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- The render pipeline, the shaders or the look ->
  [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- The game is slow or the draw-call count is too high ->
  [../loom-performance/SKILL.md](../loom-performance/SKILL.md).

## Pick the approach

| Need | Choose | Default |
|---|---|---|
| Many sprites in one scene | Sprite Atlas | one atlas per scene or character (C-088) |
| Repeating grid geometry | Tilemap | a visual tilemap and a separate collision tilemap merged by a `CompositeCollider2D` (C-090); the renderer culls per chunk (C-089) |
| Still art | Static sprite | renderer only, no script |
| Moving art | Animated sprite | Animator clip, or a code-driven sprite swap |
| Player or camera-controlled motion | Kinematic Rigidbody2D | `MovePosition` with interpolation |
| Pushed, thrown or stacked | Dynamic Rigidbody2D | physics drives it, interpolation on |
| Level geometry | No Rigidbody2D | collider only, or a composite collider (C-090) |
| Scene lighting | Baked lightmap | `Light2D` only where it is dynamic and budgeted |
| Panels and frames | 9-slice sprite | sliced sprite, never stretched art |

Symptom to move:

- Blurry or jittering art -> constant PPU, point filter, no compression,
  integer zoom, camera snapped to the grid (C-113).
- Too many draw calls -> one atlas per scene, same-atlas sprites adjacent,
  and the count read back from a capture.
- Greedy collision -> separate visual and collision tilemaps, merged into one
  `CompositeCollider2D` (C-090), no rigidbody on static tiles.
- Falls through at speed -> continuous detection on the fast body, or a
  raycast move.
- Detection -> `Physics2D.OverlapCircle` (C-120) allocates its result array,
  so it cannot run per frame; check the overloads of the version in use
  before you rely on a form that fills a list you own.

## Setup defaults

Encode these in an `AssetPostprocessor` so they are reproducible.

| Setting | Value | Evidence |
|---|---|---|
| Pixels per unit | one project constant, matched by the camera | Project default - tune against the art scale |
| Filter mode | Point for pixel art, Bilinear otherwise | Project default - tune against the art |
| Sprite mode | `Multiple` for a sheet, `Single` for one sprite | Project default - tune against the art source |
| Pixel art import | `Single` with mesh type `Full Rect`, compression `None` | Project default - tune against the art source |
| Other import | mesh type `Tight` with a platform compression | Project default - tune against the art source |
| Platform compression | ASTC or ETC2 on mobile, BC7 or BC3 on desktop | C-043 |
| Sprite atlas | one per scene or character, variants for palette swaps | C-088 |
| Tilemap chunk size | the visible area plus one tile | Project default - tune against the visible camera area |
| Chunk culling | the renderer culls per chunk, so a chunk wider than the camera is wasted | C-089 |
| Collision geometry | a separate collision tilemap merged by a `CompositeCollider2D` | C-090 |
| Light types | Global, Point, Spot, Line and Freeform | C-206 |
| Rigidbody2D type | Dynamic when pushed, Kinematic when moved, none for level geometry | Project default - tune against the movement design |
| Pixel perfect | `PixelPerfectCamera`, with `assetsPPU` equal to the sprite PPU | C-113, C-205 |
| Sorting | one sorting layer per role, order in layer for detail | Project default - tune against the draw order |
| Batching | same atlas, same material, adjacent order | Project default - tune against the draw-call count |

## Examples

Custom rule tile — pick the sprite from the neighbours. A rule tile derives
from `TileBase`, and `m_DefaultSprite` and `m_TileToPlace` are its serialised
fields (C-201). `RuleTile` comes from the 2D Tilemap package you already have
installed; the `extras` package adds `RuleOverrideTile`,
`AdvancedRuleOverrideTile` and `AutoTile` (C-111). Confirm the package name
against your own `Packages/manifest.json` before referencing the type.
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

Tilemap query — `Tilemap.GetTile` is an instance method, so resolve the
component once and reuse it (C-112).
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

Sprite atlas load and release — the handle is released exactly once, and an
atlas sprite is addressed with `AssetReferenceAtlasedSprite` (C-121).
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

Runtime sprite — `Sprite.Create` builds a Sprite at runtime (C-114); it
never replaces an atlas.

Pixel perfect — `PixelPerfectCamera` keeps pixel art crisp and stable at
different resolutions (C-113). Set `assetsPPU` to the sprite PPU and the
reference resolution to the art size, then snap the camera to the grid.

## Red lines

- No per-frame `GetComponent`, `Find*` or `Camera.main` (C-002, C-006).
- No per-frame string concatenation, formatting or interpolation.
- No 2D lighting without a light budget and a normal map per material.
- No per-platform compression left at the default (C-043).
- No 3D colliders or rigidbodies in a 2D scene.
- No `Rigidbody2D` on a moving object without interpolation enabled.
- No `Rigidbody2D` on static level geometry, and no per-sprite textures
  mixed with atlases.
- No allocating 2D overlap query in a hot path; `Physics2D.OverlapCircle`
  allocates its result array (C-120).
- No bare chunk number; the chunk size follows the visible area.

## Verify

- A profiler capture shows no GC allocation per frame in steady-state gameplay.
- Art is crisp at the smallest, the middle and the largest supported
  resolution, and does not shimmer while moving.
- The draw-call count of the test scene matches the atlas plan, read back
  from the capture below.
- Physics is deterministic: the same input sequence gives the same result.
- A build on the floor platform runs at the target frame rate.
- The `Done when` gate of [workflows/2d.md](../../workflows/2d.md) passes.

```text
HUMAN HANDOFF
What:   Capture the draw-call count and the batch list of the 2D test scene
Why:    The frame debugger is a window-only tool, so the agent cannot read
        the pass list itself at any tier
Steps:  1) Open the 2D test scene in the editor
        2) Open the frame debugger and select one rendered frame
        3) Record the draw-call count and the batch per atlas
        4) Report both numbers next to the atlas plan
Verify: the draw-call count is at or below the number in the project target
        table, and every atlas appears as one batch
```

## Handoff

- Frame budget, draw calls, GC -> [../loom-performance/SKILL.md](../loom-performance/SKILL.md).
- HUD, menus and text -> [../loom-ui-audio/SKILL.md](../loom-ui-audio/SKILL.md).
- 2D shaders and URP setup -> [../loom-graphics/SKILL.md](../loom-graphics/SKILL.md).
- Atlases, save data, asset loading -> [../loom-project/SKILL.md](../loom-project/SKILL.md).
- Target builds and device checks -> [../loom-release/SKILL.md](../loom-release/SKILL.md).
