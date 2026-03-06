# David's Preferences & Working Style

How David works, what he expects, and rules he's explicitly set.

---

## Communication Rules

### Full Technical Detail — MANDATORY
- NEVER simplify or dumb down technical details
- David wants: token counts, model names, costs, protocol details, error messages — the whole story
- He noticed system prompts stripping technical details from sub-agent reports — he hates this
- "I like the tech details, it helps me understand and improve"
- He toggles reasoning/thinking visibility himself via OpenClaw UI — doesn't need filtering

### Keys & Secrets Protocol
- **NEVER ask David to paste keys/secrets in chat**
- Give him the terminal command instead: `echo "ENV_VAR=YOUR_KEY_HERE" >> .env`
- Keys go in `.env` or `.secrets/`, never in chat messages

## Working Patterns
- **Late night worker** — best strategic thinking 9pm-midnight, 2am ideas common
- **Rapid-fire communicator** — types fast, makes typos, parse intent not spelling
- **Iterative refiner** — likes editing documents section by section in chat
- **Parallel processor** — comfortable with multiple agents, live dashboard, concurrent edits
- **Knows what to cut** — excellent noise vs signal instinct
- **Values preparation** — won't wing important meetings despite exhaustion

## What He Needs
- **Organisation:** Keep him on track, prioritise, don't let things fall through cracks
- **Challenge:** Tell him when ideas are daft. Honesty over sycophancy.
- **Proactivity:** Research autonomously, especially overnight. Morning briefings.
- **Fun:** Banter is mandatory.
- **Flexibility:** Adapt to task-jumping; help him return when needed

## Document Quality Standards

For formal reports/briefings (NOT internal chat/notes):
- **British English ALWAYS** (behaviour, recognised, materialised)
- **No contractions** (has not, does not, cannot)
- **Professional terminology** (patent assertion entity, not "patent troll")
- **No emotive language** (SHOWSTOPPER → Material risk to viability)
- **Evidence-based** with balanced presentation
- **Big 4 consulting standard** (KPMG/Deloitte/PwC)
- **Reference:** `docs/PROFESSIONAL_REPORT_STANDARDS.md`

## Identity Notes
- **David** in all direct communications
- **Tess** ONLY in Discord context (his Discord persona)
- Never mix these up

---

*Last updated: 2026-02-14*

## Security — ABSOLUTE RULE (2026-02-23)
NEVER ask David to paste tokens, API keys, passwords, or secrets into chat.
This includes: personal access tokens, OAuth tokens, SSH private keys, .env values.
Safe alternatives:
- Device flow (gh auth login, OAuth device code — user enters code on website, nothing in chat)
- SSH keys (generate on target machine, add public key to service — only public key ever shared)
- Write secrets directly to .env files on the target machine via secure channels (not chat)
- Reference env vars by name only, never ask for the value
If tempted to ask "can you paste your token here" — STOP. Find another way.

## GitHub
- David's GitHub username: `myoldmansadustman`
- Added as admin to `claudiaandromeda/shared-knowledge` repo
