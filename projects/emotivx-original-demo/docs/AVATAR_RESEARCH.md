# Player Avatar Generation — Research (2026-03-05)

## The Goal
Generate consistent, stylized player avatars from official photos. Every player on a team must look like the same art style (illustrated/cartoon, not photorealistic), but be recognisable as themselves. Team kit colours applied.

---

## Recommended Approach: ComfyUI + Flux + Style LoRA + IP-Adapter

### Why this wins
- **Already set up** — ComfyUI + Flux Schnell running on David's M4 Pro Mac (confirmed working, 15-30s/image)
- **Zero cost** — local generation, no API fees
- **No content moderation** — Flux is uncensored, won't block sports imagery
- **Consistent style** — LoRA locks the art style, IP-Adapter swaps the face
- **Batch capable** — ComfyUI workflows can be scripted for entire squads

### How it works (pipeline)

```
1. STYLE DEFINITION (one-time)
   ├── Create 4-6 reference avatars manually in the desired cartoon/illustrated style
   ├── Train a Style LoRA on these references (FluxGym or ComfyUI-FluxTrainer)
   └── This LoRA defines "what an EmotivX player avatar looks like"

2. PER-PLAYER GENERATION (automated)
   ├── Input: Player headshot photo (from official team site)
   ├── Load Style LoRA (strength 0.8-1.0) → locks the illustrated look
   ├── Load IP-Adapter (XLabs-AI/flux-ip-adapter, strength 0.6-0.8) → captures face identity
   ├── Prompt: "stylized illustrated avatar of [player], wearing [team colour] kit, white background"
   ├── ControlNet OpenPose (optional) → consistent pose across all players
   └── Output: Consistent stylized avatar preserving player likeness

3. POST-PROCESSING
   ├── Remove background (rembg or SAM)
   ├── Apply team kit overlay if needed
   ├── Resize to standard dimensions (512x512 or 1024x1024)
   └── Upload to Supabase Storage → update players.avatar_url
```

### Key models needed
| Model | Purpose | Size | Status |
|-------|---------|------|--------|
| Flux Schnell FP8 | Base model | ~16GB | ✅ Already installed |
| Style LoRA | Lock art style | ~200MB | ❌ Need to train |
| IP-Adapter (Flux) | Face identity | ~1GB | ❌ Need to download |
| ControlNet OpenPose | Consistent pose | ~700MB | ❌ Optional |
| rembg | Background removal | ~170MB | ❌ Need to install |

### Training the Style LoRA
1. Create 4-6 "gold standard" avatars manually (Flux + careful prompting)
2. Match the style from the demo video (that cartoon Man Utd player with thumbs up)
3. Train LoRA: 500-1000 steps, learning rate 1e-4, trigger word "emotivx_avatar"
4. Test on 3-4 different player photos to verify consistency
5. Iterate until every output looks like the same artist drew them

---

## Alternative Approaches (Evaluated)

### Option B: Ready Player Me API
- **Pros**: Programmatic REST API, one photo → 3D avatar, GLB export
- **Cons**: Monthly subscription ($$$), limited cartoon styles, their style not ours, rate-limited batch
- **Verdict**: Too expensive and not customisable enough for our brand

### Option C: MetaPerson Creator (Avatar SDK)
- **Pros**: Photo → customisable 3D cartoon avatar, body types, outfits
- **Cons**: Paid API, 3D focus (we need 2D illustrated), less control over art direction
- **Verdict**: Overkill — we want 2D illustrated avatars, not full 3D models

### Option D: PuLID-Flux / Flux Kontext
- **Pros**: Single-image reference, no LoRA needed, good identity retention
- **Cons**: Less style control than LoRA, newer/less tested
- **Verdict**: Good fallback if LoRA training proves too fiddly

### Option E: Manual illustration per player
- **Pros**: Perfect control, exactly what we want
- **Cons**: Doesn't scale — 24+ players per team × multiple teams = hundreds of illustrations
- **Verdict**: Not viable at scale, but good for the initial "gold standard" references

---

## Recommended Implementation Plan

### Phase 1: Style Definition (1-2 hours)
1. Pick the art style from the demo video as reference
2. Generate 6 reference avatars using Flux + careful prompting
3. Ensure they all look like "the same artist" — consistent line weight, shading, proportions
4. These become the training data for the Style LoRA

### Phase 2: LoRA Training (2-3 hours)
1. Install FluxGym or ComfyUI-FluxTrainer
2. Train Style LoRA on the 6 reference images
3. Test with 5 random player photos
4. Iterate if needed (adjust strength, retrain with more examples)

### Phase 3: Pipeline Script (1-2 hours)
1. Build a Python script: `scripts/generate_avatars.py`
2. Input: folder of player headshot photos + team colours
3. Output: folder of consistent avatars
4. Uses ComfyUI API (localhost:8188) to run the workflow programmatically
5. Batch processes entire squad in one run

### Phase 4: Integration (1 hour)
1. Upload generated avatars to Supabase Storage
2. Update player records with avatar_url
3. Display in player cards, team pages, and merch patches

---

## Source Photos Strategy

### Where to get official player photos
1. **Club official websites** — usually have squad pages with headshots
2. **Premier League / EFL sites** — standardised headshots per player
3. **Transfermarkt** — comprehensive player photos
4. **StatsBomb data** — may include player image URLs
5. **Wikipedia / Wikimedia** — Creative Commons licensed photos

### Photo requirements for best results
- **Minimum**: 512×512px, clear face, front-facing or slight angle
- **Ideal**: 1024×1024px, neutral background, even lighting
- **Avoid**: Heavy shadows, sunglasses, extreme angles, low resolution
- **Kit not required** — the LoRA/prompt handles team colours

---

## For the Demo (Euro 2024)
For the 24 Euro 2024 teams, we'd need ~24 × 23 = ~552 player avatars. At 20 seconds each locally, that's about 3 hours of generation time (fully automated, overnight batch).

For the Wrexham demo, we need ~25 player avatars. That's about 8 minutes.

---

*Research by Claudia, 2026-03-05. Sources: Perplexity search, ComfyUI community, Ready Player Me docs, Avatar SDK docs.*
