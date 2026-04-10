# Merch Preview Page — Audit
**Date:** 2026-03-09  
**File audited:** `app/merch-preview/page.tsx` (~950 lines)  
**Branch:** `feat/merch-customisation`  
**Author:** Claudia (session audit, pre-changes)

---

## ✅ What's Solid

- **Product catalogue** — 12 products, good copy, prices, materials. Well structured.
- **Customisation panel** — Moment, Style, Colours, Background, Data Line, Advanced Garment — all there, collapsible sections work well.
- **3D viewer integration** — hooked up correctly with `productType` (not `garmentType` ✅), fallback handled.
- **Auto-regenerate** — debounced 800ms on any style/colour/slider change — sensible.
- **Cart + Printful draft order** — both wired up and functional.
- **Error boundary** — page-level crash protection in place.

---

## ⚠️ Rough Edges / Known Issues

1. **xG data visible in Moment picker** — goal labels in `WREXHAM_MOMENTS` include `xg 0.xx` values (e.g. `"80' Windass #10  xg 0.75 ⭐"`). Constraint says no xG visible anywhere in the UI. Needs stripping.

2. **`garmentColour` prop removed** — completely removed after revert (commit 65626af), so colour selection has NO visual effect on the 3D garment. The colour controls exist and send params to the art server, but they don't change what the user sees on the hoodie itself.

3. **No artwork = empty viewer** — landing on `/merch-preview` without a `goalId` / `artUrl` param (and nothing in localStorage) gives a placeholder gradient with no indication of what to do next.

4. **"Order Hoodie (Draft)" button always visible** — regardless of product selected. If a mug is selected, the button still says "Order Hoodie". Misleading and needs to be product-aware or hidden for non-garments.

5. **Printful brand name in copy** — product details card says *"Printed on demand by Printful"* and footer says *"Printed and shipped by Printful · 5–7 business days"*. Constraint: should be "all over print partner" / "print partner".

6. **Logo/name overlays default OFF** — correct per spec, but toggles are below the fold and easy to miss. No visual hint these options exist.

7. **Moment accordion starts fully collapsed** — no match pre-expanded. First-time user has no idea which moment is currently active/generating.

8. **No back navigation** — header says "Your Moment, Worn" with no link back to the shop or the moment that triggered the page.

9. **`Specials — Coming Soon`** — disabled pill in the style picker. Fine functionally, but a bit dead-weight visually. Consider removing until ready.

10. **Phone/caps/accessories** — show in the product grid but use `GarmentPreview` (2D SVG path). Some products (`phonecase`, `mug` etc.) may not have proper SVG templates rendering cleanly — needs visual QA.

---

## 🤔 Improvement Opportunities

- Right panel is very long — lots of scrolling from moment picker to buy button.
- Colour controls split across "Simple Palette" and "Advanced" — could be cleaner.
- All `Section` components default closed — first-time user sees a very blank panel with no preview of what's available.
- No thumbnail/preview for art styles — just text labels ("Classic", "Geometric" etc.) — no visual hint of what each looks like.
- Style picker + Colours picker are separate sections but closely related — consider merging or linking them.

---

## 🔒 Known Constraints (Do Not Violate)

- `garmentColour` prop BREAKS 3D viewer — do not attempt mesh tinting (tried, reverted commit 65626af)
- Logo/name overlays default OFF (`logo: false`, `number: false`)
- `productType` prop (not `garmentType`) on `GarmentViewerWithFallback`
- No minting/NFT language anywhere
- No xG data in any visible UI
- Printful references → "all over print partner" / "print partner"
- `emotivx_merch_art` localStorage key feeds the homepage PHYGITAL MOMENTS viewer

---

## WebUI Stability Strategy

To prevent coordinator session hanging on large files:

1. **Coordinator = orchestration only.** Reading plans, spawning agents, reviewing results. Never edits files directly.
2. **All code changes via Claude Code agent.** Write task to `/tmp/task.md`, spawn with `pty:true background:true`, poll with `process(poll, timeout=90000)`.
3. **Read strategically** — use `head`/`tail`/`grep` rather than loading entire large files into context.
4. **One focused task per agent run** — smaller tasks = faster, safer, less context bloat.

*This audit was produced without any file edits — coordinator read-only throughout.*
