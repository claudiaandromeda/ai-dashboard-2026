# Slider Auto-Regeneration Pattern

**Found:** 2026-03-03 11:28 GMT (recovered from git history + marketplace page)  
**Location:** `/app/(marketplace)/page.tsx` (proven, tested, working)  
**Status:** ✅ VERIFIED PRODUCTION CODE

---

## The Pattern (React TypeScript)

### 1. Imports
```typescript
import { useState, useCallback, useRef, useEffect } from "react";
```

### 2. State Setup
```typescript
const [bgDetail, setBgDetail] = useState(50);
const [dataDetail, setDataDetail] = useState(50);
const [bloom, setBloom] = useState(50);
const [intensity, setIntensity] = useState(50);
const [dataScale, setDataScale] = useState(50);
const [style, setStyle] = useState("pebbles");
// ... all slider states

const debounceRef = useRef<NodeJS.Timeout | null>(null);
```

### 3. Generation Function (useCallback)
```typescript
const generatePattern = useCallback(
  async (overrides?: Record<string, any>) => {
    const params = {
      style: overrides?.style ?? style,
      bgDetail: overrides?.bgDetail ?? bgDetail,
      dataDetail: overrides?.dataDetail ?? dataDetail,
      bloom: overrides?.bloom ?? bloom,
      intensity: overrides?.intensity ?? intensity,
      dataScale: overrides?.dataScale ?? dataScale,
      // ... all other params
    };

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/art/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.ok) {
        setImageUrl(data.image);
      } else {
        setError(data.error || "Generation failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  },
  [
    style, bgDetail, dataDetail, bloom, intensity, dataScale,
    // ... ALL slider dependencies
  ]
);
```

**KEY:** Dependency array must include ALL state variables that affect generation.

### 4. Initial Generation (on mount)
```typescript
useEffect(() => { 
  generatePattern(); 
}, []);  // Empty deps = run once on mount
```

### 5. Debounce Function (600ms)
```typescript
const dg = (overrides: any) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => generatePattern(overrides), 600);
};
```

**How it works:**
- User moves slider → calls `dg({ bgDetail: newValue })`
- `dg()` clears any pending timeout (if user was sliding fast)
- `dg()` schedules `generatePattern()` to run 600ms from now
- If user moves slider again before 600ms, previous timeout is cancelled and a new one starts
- Result: generation only happens after user stops moving slider for 600ms

### 6. Slider onChange Handler
```typescript
<input 
  type="range" 
  min={0} 
  max={100} 
  value={bgDetail}
  onChange={(e) => { 
    const v = Number(e.target.value); 
    setBgDetail(v);  // Update state immediately (for visual feedback)
    dg({ bgDetail: v });  // Debounce generation call
  }}
  disabled={loading}
/>
```

**Pattern:**
- `setState(v)` — update local state immediately (slider moves instantly)
- `dg({ key: v })` — debounce the API call (generation waits 600ms)

---

## Why This Works

### Responsive UI
- Slider responds instantly to mouse movement (setState is synchronous)
- User sees smooth slider animation immediately

### Network Efficiency
- Generation API only called once after user stops moving (600ms)
- Prevents 20+ API calls per second if user drags slider fast
- Saves bandwidth, reduces server load

### Elegant Code
- `useRef` holds timeout ID (doesn't re-render)
- `useCallback` with full dependency array prevents stale closures
- `dg()` is a simple wrapper (easy to understand)

---

## All Parameters Used (from marketplace)

```typescript
const dg = (overrides: any) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => generatePattern(overrides), 600);
};

// Applied to these sliders:
{[
  { label: "Background Detail", value: bgDetail, set: setBgDetail, key: "bgDetail" },
  { label: "Data Line Detail", value: dataDetail, set: setDataDetail, key: "dataDetail" },
  { label: "Data Line Bloom", value: bloom, set: setBloom, key: "bloom" },
  { label: "Data Line Intensity", value: intensity, set: setIntensity, key: "intensity" },
  { label: "Data Fill", value: dataScale, set: setDataScale, key: "dataScale" },
  { label: "Cell Edge Visibility", value: edgeVisibility, set: setEdgeVisibility, key: "edgeVisibility" },
  { label: "Secondary Colour", value: secondaryAccent, set: setSecondaryAccent, key: "secondaryAccent" },
  { label: "Rotation", value: rotation, set: setRotation, key: "rotation" },
  { label: "Pattern Repeat", value: repeatSize, set: setRepeatSize, key: "repeatSize" },
  { label: "Motif Size", value: motifScale, set: setMotifScale, key: "motifScale" },
  { label: "Data Points", value: markerSize, set: setMarkerSize, key: "markerSize" },
].map(({ label, value, set, key }) => (
  <input 
    key={key}
    onChange={(e) => { const v = Number(e.target.value); set(v); dg({ [key]: v }); }}
  />
))}
```

---

## Debounce Timing

**600ms chosen because:**
- Fast enough for interactive feel (< 1 second)
- Slow enough to batch rapid slider movements
- Typical human reaction time is 200-300ms, so 600ms gives buffer
- Can be tweaked: `setTimeout(() => ..., 300)` for faster, `..., 1000` for slower

---

## Never Lose This Again

This pattern is:
- ✅ Logged to this file (permanent)
- ✅ Saved in conversation-logs (backed up)
- ✅ Committed to git (recoverable)
- ✅ In marketplace/page.tsx (working code reference)

**To implement:**
1. Copy this pattern
2. Replace `bgDetail, dataDetail, ...` with your state variables
3. Add them ALL to `useCallback` dependency array
4. Map sliders to `dg({ [key]: value })`
5. Test with marketplace page first (proven working)

---

**Status:** CRITICAL PATTERN — DO NOT DELETE  
**Owner:** David + Claudia AI  
**Last Verified:** 2026-03-03 11:28 GMT (marketplace/page.tsx)
