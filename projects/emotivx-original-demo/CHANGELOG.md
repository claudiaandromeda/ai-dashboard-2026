# EmotivX Art Engine — Changelog

## v0.1.0 — Art Engine Foundation (2026-03-02)

### Core Architecture
- **Two-layer rendering system**: continuous Voronoi background (never tiled) + transparent data-line glow overlay
- **8 clubs configured**: Arsenal, Man Utd, Wrexham, Chelsea, Liverpool, Barcelona, Tottenham, Man City
- **Home/Away palettes** with primary, secondary, accent, background colours

### Pattern Controls (5 sliders + 3 toggles)
| Control | Range | What it does |
|---------|-------|-------------|
| Background Detail (cyan) | 0-100 | Cell density: 600 → 8000 cells |
| Data Line Detail (emerald) | 0-100 | Glow cell density: 400 → 2500 |
| Data Line Bloom (rose) | 0-100 | Laser trace → full cell bloom |
| Rotation (orange) | 0°-360° | Rotates data line layer |
| Pattern Repeat (purple) | 0-100 | Single → micro tiles (5% scale) |
| Invert Colours | toggle | Flips lightness within same hue |
| Random Rotation | toggle | Randomly rotates each tiled motif |
| Show Data | toggle | Event markers at passes/shot/goal |

### Data Line Features
- **Event-aware path**: 18-event goal build-up (14 passes → 3 shot → 1 goal)
- **Event escalation**: passes (normal), shot (1.1× wider), goal (2.5× radial burst)
- **Goal starburst**: purely radial, organic noise (0.7-1.3× per cell), no hard edges
- **Laser trace**: 3-layer drawn stroke (ambient + mid + hot core) at low bloom, fades as bloom increases
- **Smooth path**: Bézier interpolation with 40 points per segment

### Technical
- Python engine: `art_engine/api_generate.py` (14 CLI args)
- Next.js API: `app/api/art/generate/route.ts`
- Fan UI: `app/(marketplace)/page.tsx`
- Gallery: all outputs saved to `art_engine/output/gallery/`
- 5 v1 style presets preserved: geometric, camo, futuristic, street, classic

### Known Limitations
- Synthetic path data only (real StatsBomb data not yet wired in)
- No Wrexham match data in StatsBomb open dataset
- High density (8000 cells) + repeat can be slow (~10-15s generation)

---

## Planned

### v0.2.0 — Data & Polish
- Wire real StatsBomb moment data
- Glow intensity slider (brightness independent of spread)
- Seed shuffle button (randomize cell layout)
- Cell edge visibility slider
- Export resolution toggle (1024/2048/4096)

### v0.3.0 — Product Compositor
- Team crest overlay at fixed position
- Player number / moment text
- Multiple garment templates

### v0.4.0 — AI Mockups
- Gemini photorealistic product renders
- Consumer photo face swap
- Stadium backgrounds per club
