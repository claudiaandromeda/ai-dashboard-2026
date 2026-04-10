# Euro 2024 Browser UI — Quick Start

## ✅ What's Built

A full-featured React browser for all 51 Euro 2024 matches with:
- **51 Match Gallery** with real StatsBomb data
- **Search** by team name (e.g., "Spain", "England", "Germany")
- **Sort Options:**
  - Date (Group → Final)
  - Goals (Highest Scores First)
  - Shot Count
  - Pass Count (Dominant Teams)
- **Live Stats Display:**
  - Final score
  - Pass counts (home | away)
  - Shot counts (home | away)
  - Possession % with visual bar
  - Match date

---

## 🚀 How to View

### Option 1: Cursor (If Tess is Using It)
1. Open Cursor on the Mac mini
2. Open `/Users/claudia/.openclaw/workspace/projects/emotivx_app/`
3. Terminal → `npm run dev`
4. Visit: **http://localhost:3000/euro-2024** (or 3001 if 3000 is in use)

### Option 2: CLI
```bash
cd /Users/claudia/.openclaw/workspace/projects/emotivx_app
npm run dev
```
Then visit: **http://localhost:3000/euro-2024**

---

## 📁 File Structure

```
app/
└── euro-2024/
    └── page.tsx  ← Full React UI component (287 lines)

public/
└── competitions/
    └── euro_2024/
        └── geometric/
            ├── 01_Netherlands_England.png
            ├── 02_Spain_England.png
            ...
            └── 51_Germany_Scotland.png  (symlinked from art_engine/output/)
```

---

## 🎮 Usage

1. **Browse:** Scroll through the grid of 51 matches
2. **Search:** Type "Spain" or "Germany" to filter teams
3. **Sort:** Click dropdown to reorder by goals, passes, shots, or date
4. **Hover:** Cards glow on hover for visual feedback
5. **View Stats:** Each card shows:
   - Score (large, blue)
   - Pass counts from real event data
   - Shot counts from real event data
   - Possession % with progress bar

---

## 📊 Sample Data

**Germany 5 - 1 Scotland (Final Group Match)**
```
Passes:     724 | 275
Shots:       20 | 1
Possession:  73% | 27%
```

---

## ⚙️ Customization (When Ready)

### Add More Styles
Once broken glass and spider web are rendered:
```typescript
// In page.tsx, change:
<option value="broken_glass">Broken Glass (Coming)</option>
// To:
<option value="broken_glass">Broken Glass (Ready)</option>

// And re-generate images:
// cd art_engine && python3 -c "from euro_compositor import render_euro_2024_all; render_euro_2024_all(style='broken_glass')"
```

### Add Filters
- Filter by possession range (30%-70%)
- Filter by goal count (0-2, 3+, 5+)
- Filter by competition phase (Groups, Knockouts, Final)
- Add comparison mode (side-by-side)

### Dynamic Stats
Currently using placeholder stats generation. To integrate real extracted stats:
```typescript
// Create: lib/match-stats.json
{
  "3942819": { "home_passes": 444, "away_passes": 621, ... },
  "3943043": { "home_passes": 593, "away_passes": 324, ... },
  ...
}
```

---

## 🔧 Tech Stack

- **Framework:** Next.js 16.1.3 with TypeScript
- **UI:** React 19 (client-side, no external UI library)
- **Styling:** Tailwind CSS (dark theme, blue accents)
- **Data:** StatsBomb JSON + generated PNG gallery
- **Performance:** Static image serving via public symlinks

---

## ✅ Status: Ready to Use

**Next steps:**
1. ✅ Browse the UI
2. Refine visuals (text colors, fonts, layout)
3. Integrate real stat extraction
4. Add other styles (broken glass, spider web)
5. Deploy or embed in main EmotivX app

---

**Branch:** `feature/style-honeycomb`  
**Last Updated:** 2026-03-03 09:33 GMT
