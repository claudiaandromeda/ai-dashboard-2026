# EmotivX Moment Creator — Complete Build Plan

**Status:** READY TO BUILD  
**Date:** 2026-03-03 11:28 GMT  
**Owner:** David + Claudia AI

---

## What We're Building

Transform Euro 2024 football matches into **stunning artwork driven by real goal data**:
1. User picks a match
2. System lists all goals in that match
3. User picks a goal
4. System extracts all passes leading to that goal (possession maintained)
5. User customizes with 11 sliders (bgDetail, bloom, rotation, etc.)
6. System generates unique artwork pattern (4 tessellation styles + 5 new named styles)
7. User exports as PNG (1K/2K/4K resolution)
8. Future: AI shows what pattern looks like on actual hoodie (Nano Ban 2 integration)

---

## Architecture Decision

**Use existing marketplace UI + modify for goal selection**

Why:
- All sliders + debounce already working and tested
- All 4 tessellation styles working
- All 11 controls implemented
- Just need to:
  1. Add goal selection logic (StatsBomb data extraction)
  2. Refactor for Moment Creator flow (match → goals → pick goal → generate)
  3. Update API to accept goal-specific data
  4. Add 5 new named art styles (Geometric, Camo, Futuristic, Street, Classic)
  5. Add team-specific BG patterns

---

## Phase 1: Goal Selection & Data Extraction

### Step 1a: Load StatsBomb Goals for Match
```typescript
// In /app/moments/create/page.tsx
const loadGoalsForMatch = async (matchId: number) => {
  const response = await fetch(`/data/statsbomb/events/${matchId}.json`);
  const events = await response.json();
  
  // Filter for goals
  const goals = events.filter(e => e.type.name === "Goal");
  
  // Format: Goal 1 - Player Name (minute)
  return goals.map(goal => ({
    id: goal.id,
    player: goal.player.name,
    minute: goal.minute,
    period: goal.period,
    timestamp: goal.timestamp,
  }));
};
```

### Step 1b: Extract Passes Leading to Goal
```typescript
// For each goal, backtrack to find all passes while possession maintained
const extractGoalSequence = (events: any[], goalEventId: string) => {
  const goalIdx = events.findIndex(e => e.id === goalEventId);
  const goal = events[goalIdx];
  const possession_team = goal.team.id;
  
  // Walk backwards from goal, collecting passes
  const path = [];
  for (let i = goalIdx - 1; i >= 0; i--) {
    const event = events[i];
    
    // Stop if we lose possession
    if (event.type.name === "Duel" || event.type.name === "Pressure") {
      // Check if possession flipped
      if (event.team.id !== possession_team) break;
    }
    
    // Collect passes, shots
    if (["Pass", "Shot", "Goal"].includes(event.type.name)) {
      path.unshift({
        x: event.location[0] / 120,  // Normalize to 0-1
        y: event.location[1] / 80,
        type: event.type.name === "Goal" ? "goal" : (event.type.name === "Shot" ? "shot" : "pass"),
        minute: event.minute,
      });
    }
    
    // Stop at next goal/miss or possession loss
    if (event.type.name === "Goal" && event.id !== goalEventId) break;
  }
  
  return path;
};
```

### Step 1c: Add Goal Selection UI
```typescript
// In /app/moments/create/page.tsx — after match selected, show goal list

const [goals, setGoals] = useState([]);
const [selectedGoal, setSelectedGoal] = useState(null);

const handleSelectMatch = async (match) => {
  setSelectedMatch(match);
  const goalList = await loadGoalsForMatch(match.match_id);
  setGoals(goalList);
  setStep("goals");  // New step before generate
};

// Render goal list
{step === "goals" && (
  <div>
    <h2>Goals in {selectedMatch.home_team.home_team_name} vs {selectedMatch.away_team.away_team_name}</h2>
    <div className="grid grid-cols-2 gap-2">
      {goals.map(goal => (
        <button 
          key={goal.id} 
          onClick={() => {
            setSelectedGoal(goal);
            setStep("generate");
            generateMoment(selectedMatch, goal);
          }}
          className="...">
          Goal {goals.indexOf(goal) + 1} — {goal.player} ({goal.minute}')
        </button>
      ))}
    </div>
  </div>
)}
```

### Step 1d: Pass Data to API
```typescript
const generateMoment = async (match, goal) => {
  const path = extractGoalSequence(events, goal.id);
  
  const payload = {
    matchId: match.match_id,
    goalId: goal.id,
    path: path,  // All passes + shot + goal leading up
    style,
    bgDetail, dataDetail, bloom, intensity, dataScale,
    // ... all sliders
  };
  
  const response = await fetch("/api/moments/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
```

---

## Phase 2: Slider Restoration

### Copy Debounce Pattern
Copy from `/app/(marketplace)/page.tsx` exactly:

```typescript
import { useState, useCallback, useRef, useEffect } from "react";

const debounceRef = useRef<NodeJS.Timeout | null>(null);

const generatePattern = useCallback(
  async (overrides?: Record<string, any>) => {
    // ... generation logic
  },
  [style, bgDetail, dataDetail, bloom, intensity, dataScale, edgeVisibility, 
   secondaryAccent, rotation, repeatSize, motifScale, markerSize]
);

const dg = (overrides: any) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => generatePattern(overrides), 600);
};

// Apply to all sliders:
onChange={(e) => { const v = Number(e.target.value); setBgDetail(v); dg({ bgDetail: v }); }}
```

### All 11 Sliders
1. Background Detail (cyan) — 0-100 → 600-5000 cells
2. Data Line Detail (emerald) — 0-100 → 400-2500 cells
3. Data Line Bloom (rose) — 0-100 → laser to maximum spread
4. Data Line Intensity (yellow) — 0-100 → dim to blazing
5. Data Fill (lime) — 0-100 → compact to full canvas
6. Cell Edge Visibility (slate) — 0-100 → smooth to faceted
7. Secondary Colour Accent (indigo) — 0-100 → off to strong
8. Rotation (orange) — 0-360 → rotate data line
9. Pattern Repeat (purple) — 0-100 → single to micro tiles
10. Motif Size (fuchsia) — 0-100 → tiny to huge
11. Data Points / Marker Size (teal) — 0-100 → hidden to blazing

---

## Phase 3: New Art Styles (9 Total)

### Existing 4 Tessellation Styles ✅
- 🪨 Pebbles (Voronoi) — rounded organic cells
- 💎 Broken Glass (Delaunay) — sharp angular shards
- 🕸️ Spider Web (radial spokes) — concentric rings from goal
- 🐝 Honeycomb (hex grid) — flat-top hexagons

### NEW 5 Named Styles (To Create)
Each uses ONLY team colours (home/away/combo):

1. **Geometric** — Modern angular shapes (squares, triangles, diamonds)
2. **Camo** — Military-style camouflage pattern
3. **Futuristic** — Neon laser grid + distortion
4. **Street** — Spray paint effect (splatter, graffiti marks)
5. **Classic** — Plain solid colour with subtle texture

**Implementation:**
- Create `art_engine/styles/geometric.py`, `camo.py`, etc.
- Each returns `(cells, gradients, overlays)` in standard format
- Register in `STYLE_REGISTRY` in `api_generate.py`
- Update UI style selector to show all 9

---

## Phase 4: Team-Specific Background Patterns

### 24 Euro 2024 Teams
Each gets a unique pattern under the data motif:

| Team | Nickname | Pattern Idea |
|------|----------|--------------|
| Arsenal | Gunners | Bullet holes, cannon blast |
| West Ham | Hammers | Cracked anvil, impact marks |
| Brentford | Bees | Honeycomb (native style) |
| Wolves | Wolves | Claw marks, scratch patterns |
| Liverpool | Reds | Flame radiations, phoenix |
| Manchester United | Red Devils | Devil horns, flame pattern |
| Tottenham | Spurs | Star radiations, spur shapes |
| Chelsea | Blues | Crown pattern, regal shapes |
| Man City | Sky Blues | Cloud pattern, sky texture |
| Brighton | Seagulls | Wing patterns, seagull silhouettes |
| Aston Villa | Lions | Lion mane texture, regal gold |
| Fulham | Cottagers | Straw/tile cottage pattern |
| Crystal Palace | Eagles | Eagle feather pattern |
| Ipswich | Tractor Boys | Tractor tire tread |
| Bournemouth | Cherries | Cherry clusters pattern |
| Nottingham Forest | Reds | Tree ring pattern, forest wood |
| Everton | Toffees | Candy/toffee tile pattern |
| Leicester | Foxes | Fox fur texture |
| Wrexham | Dragons | Dragon scale pattern |
| Newcastle | Magpies | Feather stripe pattern |
| Southampton | Saints | Cross/halo pattern |
| Luton | Hatters | Hat brim stripe pattern |
| Wales | Dragons | Dragon scale, Celtic knot |
| Scotland | Thistle | Thistle leaf pattern |

**Implementation:**
- Create `art_engine/team_patterns.py` with function for each team
- Each pattern is a tileable PNG or procedural generator
- Layered UNDER the data motif (background + team pattern + data line)
- Keyed by 3-letter code or team name

---

## Phase 5: Connect API Route

### Update `/api/moments/generate`
```typescript
// app/api/moments/generate/route.ts

export async function POST(req: Request) {
  const { matchId, goalId, path, style, bgDetail, ... } = await req.json();
  
  // Extract goal sequence from StatsBomb
  const events = loadEventsForMatch(matchId);
  const goalPath = extractGoalSequence(events, goalId);
  
  // Call Python engine
  const pythonArgs = JSON.stringify({
    club: "arsenal",  // Extract from match data later
    kit: "home",
    style: mapUIStyleToRealStyle(style),
    bgDetail, dataDetail, bloom, ...,
    path: goalPath,  // Include the goal sequence
    width: 1024,
    outputPath: "/tmp/emotivx_moment.png",
  });
  
  // Spawn Python
  const python = spawn("python3", ["/path/to/api_generate.py", pythonArgs], ...);
  // Read result, return as base64
}
```

---

## Testing Checklist

### Phase 1: Goals
- [ ] Load goals for a test match (Netherlands 1-2 England)
- [ ] List shows correct goals
- [ ] Click goal → see it selected
- [ ] Extract passes for goal → verify path in console

### Phase 2: Sliders
- [ ] Move each slider → sees visual change in image
- [ ] All 11 sliders respond
- [ ] Debounce works (generation only happens 600ms after stop moving)
- [ ] No infinite loops in console

### Phase 3: Styles
- [ ] Test all 4 existing styles
- [ ] Create + test 5 new styles
- [ ] Style dropdown shows all 9
- [ ] Each style renders without errors

### Phase 4: Team Patterns
- [ ] Pick a match with team that has pattern (e.g., Arsenal)
- [ ] See background pattern under data motif
- [ ] Switch teams → see different pattern

### Phase 5: Full Flow
- [ ] Pick match → see goals
- [ ] Pick goal → generate artwork
- [ ] Move sliders → artwork updates smoothly
- [ ] Download PNG → file is correct
- [ ] Test 4K export → takes < 5 seconds

---

## Files to Modify

| File | Change | Status |
|------|--------|--------|
| `app/moments/create/page.tsx` | Add goal selection UI + debounce sliders | ⏳ |
| `app/api/moments/generate/route.ts` | Accept goal data, pass to Python | ⏳ |
| `art_engine/api_generate.py` | Accept `path` param, render goal sequence | ⏳ |
| `art_engine/styles/geometric.py` | New style | ⏳ |
| `art_engine/styles/camo.py` | New style | ⏳ |
| `art_engine/styles/futuristic.py` | New style | ⏳ |
| `art_engine/styles/street.py` | New style | ⏳ |
| `art_engine/styles/classic.py` | New style | ⏳ |
| `art_engine/team_patterns.py` | All 24 team patterns (NEW FILE) | ⏳ |

---

## Known Unknowns

- Which club for which match? (Need to extract from match JSON)
- Team pattern designs (need visual designer or procedural system)
- How to layer team pattern under data (transparency + compositing)
- 5 new style designs (open to David's ideas)

---

## Next Session: Start Phase 1

1. Open `app/moments/create/page.tsx`
2. Add `loadGoalsForMatch()` function
3. Add goal selection UI (step before "generate")
4. Test with real StatsBomb data
5. Then move to Phase 2 (sliders)

**Estimated time for full implementation:** 6-8 hours (broken across sessions)

---

**Status:** READY TO BUILD  
**Blocker:** None — all decisions made, patterns documented, architecture clear  
**Owner:** Claudia AI (David steering)
