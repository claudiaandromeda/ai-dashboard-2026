# Garment Production Rules

_Last updated: 2026-03-07 — v1.0 (draft for morning review)_

These rules govern how EmotivX garments are produced. They exist to maintain consistency, prevent regressions, and ensure every piece looks right first time. **Do not break these rules without David's explicit sign-off.**

---

## 1. Decal Positions Are LOCKED

All garment decal positions (badge, logo, name, number) were finalised on 2026-03-07 and committed as `HOODIE_CONFIG`, `TSHIRT_CONFIG`, and `LONGSLEEVE_CONFIG`.

- **Never move or scale decals** to fix a visual issue. The positions are final.
- **If a decal looks wrong**, the fix is always mesh-level (polygonOffset, Z-depth, normals) — never position/size.
- Git tag: `v0.1-decals-confirmed`. Branch: `stable/decals-confirmed`.
- Changes require David sign-off and a new git tag.

### Locked values

| Garment | Badge | Logo | Name | Number |
|---------|-------|------|------|--------|
| Hoodie | (-0.20, -0.48, 0.30) / (0.10, 0.07, 0.22) | (0.17, 0.18, 0.30) / (0.14, 0.14, 0.14) | (0.00, 0.14, -0.28) / (0.58, 0.13, 0.28) | (0.00, -0.08, -0.28) / (0.34, 0.36, 0.14) |
| T-Shirt | (-0.26, -0.58, 0.24) / (0.10, 0.07, 0.20) | (0.12, 0.26, 0.24) / (0.14, 0.14, 0.14) | (0.00, 0.38, -0.22) / (0.58, 0.13, 0.28) | (0.00, -0.02, -0.22) / (0.34, 0.36, 0.26) |
| Longsleeve | (0.25, -0.44, -0.15) / (0.09, 0.07, 0.20) | (-0.12, 0.32, -0.20) / (0.14, 0.14, 0.26) | (0.00, 0.30, 0.22) / (0.52, 0.13, 0.36) | (0.00, -0.04, 0.22) / (0.32, 0.34, 0.36) |

## 2. Decal Sizes Are Consistent Across Garments

The logo and badge must be the **same physical size** on all garments. Do NOT scale per-garment to "look better" — consistency across the range is the priority.

- Logo: `0.14 × 0.14 × 0.14` (all garments)
- Badge: `~0.10 × 0.07 × 0.20-0.22` (minor Z depth variation per garment is OK)

## 3. Height-Based Normalisation

All garment 3D models are normalised to the same height in the viewport:

- `TARGET_SCENE_HEIGHT = 1.31` scene units
- Width varies per garment (realistic proportions)
- Script: `scripts/normalize-model.mjs`
- This ensures decal positions map consistently across models

## 4. Moment Badge Is Non-Negotiable

Every piece carries the moment badge. It is the unique identifier of the artwork.

- No toggle to remove it
- Always rendered, always visible
- Must match the `EditionCard` component design (dark panel, gold border, rivets, GOAL pill)
- Badge texture on the 3D garment must visually match the UI badge

## 5. Logo and Name/Number Are Optional Toggles

- Team logo (chest): toggle, OFF by default
- Player name + number (back): toggle, OFF by default
- Toggles use `visible={bool}` prop — **never conditional render** (causes DecalGeometry remount/failure)
- Scorer name/number comes from moment data only — no free-text input (avoids profanity/IP issues)

## 6. Art Engine Pipeline

The art generation pipeline must follow this order:

```
1. Load real match data (360 format preferred)
2. Extract goal buildup path → trim to buildupDepth %
3. scale_path(path, dataScale) → scaled_path
4. Read goal event position from scaled_path → focal_point
5. ALL visual layers use the SAME scaled_path and focal_point:
   ├── Background gradient  → centres at focal_point
   ├── Sunburst            → centres at focal_point  
   ├── Brush stroke        → follows scaled_path
   └── Glow (Voronoi)      → follows scaled_path, burst at focal_point
```

**One path, one focal point, no drift.** If a layer looks misaligned, the fix is in how it reads the shared data — never give it a separate coordinate source.

## 7. Mesh Clipping Fix

When decals clip through the garment mesh (edges poking through at angles):

- **Fix**: Increase `polygonOffset` on the decal material (currently `-8`)
- **Never** move the decal position to compensate
- **Never** scale the decal smaller to avoid the edge
- If polygonOffset isn't enough, adjust the mesh normals in the GLB (rare)

## 8. Art Resolution

- Development: 512px (fast iteration)
- Configurator preview: 2048px
- Printful production: 6000×6000px @ 150dpi (printfile 200 for AOP)
- Art must scale cleanly — no hardcoded pixel values in the renderer

## 9. Printful Integration

- Orders are created as **DRAFT** by default (`confirm=false`)
- Review in Printful dashboard before confirming
- Product 388 (AOP Hoodie), placement `"default"`, printfile 200
- Variant IDs: S=10869, M=10870, L=10871, XL=10872, 2XL=10873, 3XL=10874, 4XL=10875

## 10. Colour Pipeline

- Kit palettes defined in `lib/teams.ts` — primary, secondary, accent, background
- `bg_palette` drives the background art; `data_palette` drives the data line glow
- Auto-default: luminance < 0.5 → white data (#FAFAFA); ≥ 0.5 → dark data (#111111)
- Gold accent `#C9A84C` for edition numbers, badge highlights on all home kits
- Wrexham home: `#DA291C` primary, `#FFFFFF` secondary, `#C9A84C` accent
- Wrexham away: `#F0D000` primary, `#1A5C2A` secondary, `#DA291C` accent

## 11. UV Mapping Reference

Formula: `image_y = 0.5 − scene_y / 1.31` (flipY=false)

| Scene Y | image_y | Location |
|---------|---------|----------|
| +0.655  | 0.0     | top of hood/collar |
| +0.40   | 0.195   | upper chest/collar |
| +0.18   | 0.362   | logo height |
| 0.00    | 0.500   | model centre/belly |
| −0.48   | 0.866   | badge/pocket |

## 12. Testing Before Production

Before any Printful order:
1. Generate art at 512px — verify alignment (gradient, sunburst, glow all converge)
2. Preview at 2048px on 3D garment — check decal positions, logo clipping, badge legibility
3. Rotate garment 360° — check no decal bleed-through at any angle
4. Switch all toggles (logo, name/number) on/off — verify no white screen or layout shift
5. Generate at 6000px — verify badge text is crisp, no pixelation

---

_These rules will evolve. When a rule changes, update this doc and note the date._
