# EmotivX ICP — Project Tracker

This document tracks progress, backlog, and decisions for the EmotivX Image Creation Platform (ICP).
Update this file after each significant change set or milestone.

---

## Current Focus
- Phase 1: XML Ingestion Engine (DPP) + Moment ID Metadata Schema (Moment Ledger)

---

## Status Snapshot
- **Overall Phase 1:** In progress
- **Last updated:** 2026-01-17

---

## Milestones
### Phase 1 — DPP + Moment Ledger
- [x] Supabase schema for ingestion + ledger
- [x] XML ingest Edge Function scaffold
- [x] Moment ID utility + Data Line builder
- [x] Admin audit placeholder views
- [ ] XML parsing + normalization pipeline
- [ ] Ruleset-driven moment detection
- [ ] Data Line aggregation from normalized events
- [ ] Moment Object assembly + persistence
- [ ] CCP intake endpoint (read-only)

---

## Weekly Log
### 2026-01-17
- Created project tracker and backlog
- Added Moment Ledger schema and XML ingest scaffold
- Added admin audit placeholder views
- Added StatsBomb fetch script + local data folder docs
- Added StatsBomb match listing helper script
- Added StatsBomb normalization script for canonical events
- Added StatsBomb moment detection script (goal-based)
- Improved StatsBomb normalization (auto match date + league)
- Added PUSH_TO_SUPABASE env toggle for auto-push
- Added one-command StatsBomb pipeline (fetch → normalize → detect)
- Added auto-latest pipeline + lineups fetch
- Added assist + red card detection in moment pipeline
- Added yellow cards, substitutions, penalties, own goals, and --all mode
- Added local smoke test script
- Added RLS enable migration + Supabase count checker
- Added Supabase moments preview script
- Admin view now loads live Supabase data
- Added dev:admin script to auto-load env vars
- Admin Moments: dynamic dropdown search + cross-filtering
- Admin Ingest: filters, summary cards, detail view
- Admin Ingest: CSV export
- Admin Moments: CSV export + scope selector
- Ingest run: errors CSV export
- Moment detail: data lines CSV export
- Ingest run: raw + normalized exports
- Ingest run: JSON export + preview tables + limit selector
- Moment detail: JSON export + limit selector
- Moment detail: timeline + JSON copy + payload viewer
- Moment detail: collapsible timeline + color tags + copy payload
- Moment detail: backfill command helper
- Moment detail: backfill button (local only)
- Admin roles: platform vs team
- Backfill: queue request when commands disabled
- Match metadata: stored in Supabase matches table
- Admin Matches: list + filters + sync button
- RLS: matches table
- Moments: approvals (live/hide) actions
- Approvals: return updated row + surface errors
- Moments: unapprove action
- StatsBomb 360: ingestion script + tables
- StatsBomb 360: frames table renamed to statsbomb_360_frames
- StatsBomb 360: frames-only/events-only ingestion flags
- Precision Art Engine: module scaffolds + CLI entrypoint
- Precision Art Engine: pitch calibration tool
- Added gitignore for local data + env keys

---

## Logging Protocol
- I will append a weekly log entry after each meaningful change set.
- Each entry will include the date and a short bullet list of completed work.

---

## In Progress
- None

---

## Next Up
- XML parsing + normalization pipeline
- Ruleset-driven moment detection
- Data Line aggregation from normalized events
- Moment Object assembly + persistence

---

## Backlog (Prioritized)
### P0 — Critical
- XML feed ingestion + raw storage
- Normalization layer (XML → canonical JSON)
- Moment ID generation (deterministic)
- Data Line aggregation

### P1 — Required for CCP integration
- Moment Object assembly
- Moment Ledger storage + retrieval
- Basic CCP intake endpoint

### P2 — Governance & audit
- Ingest error logging + replay
- Ingest run dashboard with metrics

### P3 — Admin tooling
- Ruleset viewer/editor (read-only v1)
- Moment list filters + search

---

## Done
- Supabase schema for Moment Ledger and ingestion tracking
- XML ingest Edge Function scaffold (`supabase/functions/xml-ingest`)
- Deterministic Moment ID utility
- Data Line builder utility (event → ordered sequence)
- Admin audit placeholder views (Ingest Runs, Moment Ledger)
- StatsBomb Open Data fetch script + local data structure
- StatsBomb match list helper script
- StatsBomb normalization script for canonical events
- StatsBomb moment detection script (goal-based)
- Git ignore for local data + env keys

---

## Decisions & Assumptions
- Launch scope: soccer goals only
- Moment ID is deterministic hash of feed + match + event + timestamp + ruleset version
- Data Line is mandatory metadata for each Moment
- View-Port is optional at launch but included in schema
- Persistent env vars are used for local testing only; rotate keys before launch

---

## Read Before Launch
- See `URGENT - Must Change Before Live.md`

---

## Open Questions
- Sample XML payloads for EPL/La Liga (format + fields)
- Ruleset definition for “emotive triggers” at launch
- NIL default splits and tagging granularity
- Provider for XML feed ingestion (contracted source)

---

## Notes
- Dark premium UI theme is the design baseline (see screenshots and deck).
