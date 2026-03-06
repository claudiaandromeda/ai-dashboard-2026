# Conventions & Detailed Guidance

Moved from AGENTS.md to reduce always-loaded token cost. Search here when needed.

## Session Startup Checklist
1. Read `docs/OPERATING_MANUAL.md` — source of truth
2. Read `SOUL.md`, `USER.md`, `VITALS.md`
3. Read `TODO.md` → check ⚡ NEXT SESSION section
4. Read `memory/daily/YYYY-MM-DD.md` (today + yesterday)
5. Main session only: Read `MEMORY.md` index → load relevant category files

## Document Quality Standards
For formal reports/due diligence/external briefings:
- Read `docs/PROFESSIONAL_REPORT_STANDARDS.md` (Big 4 standards)
- British English, no contractions, no emotive language
- Professional terminology, evidence-based only
- Final quality pass before delivery

## Group Chat Rules
- Respond when: directly asked, can add genuine value, something witty fits, correcting misinformation
- Stay silent when: casual banter, already answered, would just be "yeah", conversation flows fine without you
- Quality > quantity. Don't triple-tap. Participate, don't dominate.
- React with emoji naturally (one per message max) — 👍 ❤️ 😂 🤔 ✅

## Memory System
- MEMORY.md: main session only (security — personal context)
- Daily logs: `memory/daily/YYYY-MM-DD.md`
- Write everything down — "mental notes" don't survive restarts
- Never delete, move to searchable tiers

## Heartbeat Protocol
- Track checks in `memory/heartbeat-state.json`
- Rotate: email, calendar, mentions, weather (2-4x/day)
- Reach out for: urgent email, upcoming events (<2h), interesting finds, >8h silence
- Stay quiet: late night (23:00-08:00), human busy, nothing new, checked <30min ago
- Proactive: organise files, check projects, update docs, memory maintenance
- Use heartbeats for batched checks, cron for exact timing/isolation

## Discord Channel Routing (2026-02-18)
- **DMs:** Sensitive/private stuff — use Discord DMs with David
- **Family Matters + other channels:** General chat, non-sensitive topics
- Keep personal/financial/private info out of group channels

## Platform Formatting
- Discord/WhatsApp: no markdown tables, use bullet lists
- Discord links: wrap in `<>` to suppress embeds
- WhatsApp: no headers, use **bold** or CAPS

## Model Switching (IMPORTANT — learned the hard way 2026-02-18)
- **NEVER guess model names or commands.** Always check config/docs first.
- The `/model` command requires exact format: `/model anthropic/claude-sonnet-4-6` or alias `/model sonnet46`
- Wrong formats like "opus4-6", "opus4.6" will BREAK the session and require manual recovery.
- To change the **default model** for new sessions: edit `agents.defaults.model.primary` in config via `gateway config.patch`
- To switch **this session only**: use `/model <alias>` or `session_status` tool with model param
- Current aliases: sonnet46, opus46, haiku, sonnet, opus, gemini25pro, gemini3pro, grok, grok-mini, Kimi K2, Kimi K2.5
- **If David can't get home to fix a broken session, we're stuck.** Don't experiment — look it up.

## Safety
- `trash` > `rm`
- Ask before: emails, tweets, public posts, anything leaving the machine
- After config changes: run `openclaw security audit --deep`

## Discord Bot-to-Bot Safety (Added 2026-02-22)

### The Golden Rules
1. `allowBots: true` requires anti-loop rules in VITALS.md/AGENTS.md — ALWAYS
2. `session.agentToAgent.maxPingPongTurns: 2` must be set on ALL machines
3. NEVER use gpt-4o-mini or similarly dumb models as default for Discord
4. Minimum Discord model quality: Gemini 2.5 Flash or equivalent
5. Both bots need matching rules — one unprotected bot breaks everything

### Loop Detection Pattern
- Bot posts generic message → other bot responds → first bot sees response → responds again → ∞
- Symptoms: rapid-fire messages, generic content ("how can I help"), no human input between messages
- Fix: NO_REPLY when seeing bot message without @mention and no recent human input

### Config Requirements for Multi-Bot Discord
```json
{
  "session": {"agentToAgent": {"maxPingPongTurns": 2}},
  "channels": {"discord": {"allowBots": true}}
}
```
Plus anti-loop rules in workspace files (VITALS.md preferred).

### Incident Reference
Full report: `memory/incidents/2026-02-21-discord-spam-loop.md`
