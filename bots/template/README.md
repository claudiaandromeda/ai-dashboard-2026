# New Bot Template

Everything a new OpenClaw agent needs to get started. Self-configuring on first run.

## What's in here

| File | Purpose |
|------|---------|
| `BOOTSTRAP.md` | First-run onboarding flow — agent interviews the user and writes its own identity files |
| `AGENTS.md` | Pre-filled operating rules with anti-loop safety rules |
| `README.md` | This file |

## Files the bot will create during onboarding

| File | Created from |
|------|-------------|
| `SOUL.md` | User's answers to onboarding questions |
| `IDENTITY.md` | Chosen name + vibe |
| `USER.md` | Profile of who they're working with |

## How to deploy a new bot

1. **Clone this template** to the new bot's workspace:
   ```bash
   cp -r bots/template/* /path/to/new/bot/workspace/
   ```

2. **Pull the shared knowledge base** into the workspace:
   ```bash
   git clone https://github.com/claudiaandromeda/shared-knowledge /tmp/shared-knowledge
   cp /tmp/shared-knowledge/core/* /path/to/new/bot/workspace/
   cp -r /tmp/shared-knowledge/setup/ /path/to/new/bot/workspace/docs/
   ```

3. **Start OpenClaw** — the bot will run `BOOTSTRAP.md` automatically on first message.

4. **Let the bot and user do the rest** — the onboarding conversation builds `SOUL.md` live.

## After onboarding

The bot archives `BOOTSTRAP.md` and operates normally. From that point:
- `SOUL.md` is its personality
- `USER.md` is its knowledge of the owner
- `AGENTS.md` has its operating rules
- It starts building `memory/` on its own

## Notes

- **Do not pre-fill `SOUL.md`** — the whole point is the bot discovers its identity through conversation.
- The bot should have its **own** SOUL.md — not a copy of Claudia's or Elliot's.
- After setup, update `AGENTS.md` with environment-specific details (owner name, channel, timezone).
