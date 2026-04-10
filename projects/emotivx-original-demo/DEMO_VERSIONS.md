# Demo Versions — Quick Reference

## How to switch to a demo version
```bash
git stash          # save any uncommitted work
git checkout <tag> -- .   # restore all files to that version
# OR for a full detached checkout:
git checkout <tag>
```

## Tagged Versions

### `demo-2026-03-11` — Latest demo (Mar 11, 2026)
- **Commit:** db926c7
- **What's in it:** Full demo app + "Your Moment" public page + Streamlit CV link (192.168.0.82:8502) + IP audit report
- **Used for:** Mar 11 partnership meeting (they loved it — reconsidering deal offer)
- **Get back to it:** `git checkout demo-2026-03-11 -- .`

### `8c88502` — Original demo (Mar 9, 2026 13:46)
- **What's in it:** Full demo app before any art engine rework. Staff/admin nav, Stockport/Birmingham clubs, in-app deck, Streamlit link (localhost:8502)
- **Used for:** Mar 9 + Mar 10 demos
- **Get back to it:** `git checkout 8c88502 -- .`

### `b6d4fe9` — Pre-demo quick fixes (Mar 8, 2026)
- **What's in it:** Quick fixes night before demo. Missing some later features (no clubs on homepage, no CV page)
- **Get back to it:** `git checkout b6d4fe9 -- .`

## All post-demo work is on branch
`backup/pre-demo-revert-2026-03-11` — contains all 144 commits of art engine rework, tabbed configurator, background generators, etc.
