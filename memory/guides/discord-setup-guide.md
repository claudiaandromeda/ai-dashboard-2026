# Discord & Remote Access Setup Guide

**Created:** 2026-02-18
**Context:** Establishing the "Family Matters" onboarding environment and private business operations channels.

## 1. Remote Access (Tailscale)

**Goal:** Secure, password-less mesh network between Tess (MacBook), Claudia (Mac mini), and Elliot (Linux).

**Setup:**
- All machines authenticated to `elliotandromeda@gmail.com` Tailscale account.
- **Security Model:** One-way SSH. Tess/Claudia SSH *INTO* Elliot's Linux box. Remote Login (SSH) on Macs is kept **OFF** to reduce attack surface.
- **Conflict Management:** Do not run AVG VPN and Tailscale simultaneously. Toggle between them.

## 2. Discord Structure

**Public/Onboarding:**
- `#family-matters`: General chat, onboarding for new bots/humans (Nick, Derek).

**Private Operations (The "Andromeda Management" Category):**
- Access restricted to: Tess (Admin + Alt), Claudia (Bot), Elliot (Bot).
- **Channels:**
  - `#projects` (Threads for DD Service, M8TRX, Kingfinity)
  - `#research` (Overnight reports)
  - `#openclaw-infra` (Config, keys, setup)
  - `#strategies` (Ventures, decisions)
  - `#people` (Context)
  - `#todos` (Quick ref)

**Permissions Implementation:**
- **Method:** Create a private *Category* first.
- **Rule:** Deny `@everyone` View Channel on the category.
- **Members:** Explicitly add specific User IDs and Bot IDs.
- **Sync:** Drag channels *into* the category to inherit permissions. (Do not rely on API permission overwrites; manual category setup is more reliable).

## 3. Bot Configuration

**Allowlists:**
- Bots ignore users not in their allowlist.
- **Added:**
  - Derek: `825576715697782784`
  - Nick (Girthologist): `923769652037955604`

**Capabilities:**
- Bots need `Manage Channels` and `Manage Permissions` to create structure, but Discord API has limits on overwrite reliability. Manual intervention often faster for permission locking.

## 4. Key Lessons
- **Test First:** Always test model/config changes in a single session before global apply.
- **Rate Limits:** Anthropic limits can kill a bot mid-stream. Need fallback providers (OpenRouter/Google) configured.
- **UI vs API:** Discord API reports "success" on permission changes even if they don't apply. Verify visually or via explicit GET requests.
