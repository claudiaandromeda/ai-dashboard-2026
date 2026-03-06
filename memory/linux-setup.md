# Linux Machine Setup — OpenClaw + Claude

Guide for setting up new OpenClaw instances on Linux (e.g. Elliot's Hostinger VPS).

---

## 1. Install Claude Code CLI

**Use the official curl command from claude.ai:**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Then open a **new terminal** and run the `echo` command it gives you (adds to PATH).

**⚠️ GOTCHAS:**
- Do NOT use `npm install -g @anthropic-ai/claude-code` — use the curl method above
- If you've tried multiple install methods, clean up first:
  ```bash
  npm uninstall -g @anthropic-ai/claude-code
  rm -rf ~/.claude/local
  ```
- The installer may appear stuck — it can take a few minutes. If the cursor stops, try pressing Enter. If truly stuck, open a new terminal and check `which claude`.
- **Line breaks in API keys/tokens:** When pasting tokens into notepad/nano on Linux, watch for accidental line breaks — this causes auth failures (401 errors). ALWAYS paste on a single line.

## 2. Install OpenClaw

```bash
npm install -g openclaw
```

If `openclaw` not found after install:

```bash
export PATH="$PATH:$(npm config get prefix)/bin"
echo 'export PATH="$PATH:'$(npm config get prefix)'/bin"' >> ~/.bashrc
source ~/.bashrc
```

## 3. Run Onboarding

```bash
openclaw onboard
```

This walks through model selection, auth, channels, workspace, etc.

**To start completely fresh (nuclear option):**
```bash
openclaw gateway stop
openclaw onboard --reset
```

## 4. Anthropic Auth (Claude Max — setup-token method)

This is the CORRECT method for Claude Pro/Max subscription auth. Do NOT use OAuth or API key.

### Step-by-step:

**a) Generate the token from Claude Code:**
```bash
claude setup-token
```
This outputs a token string.

**b) Paste into OpenClaw:**
```bash
openclaw models auth setup-token --provider anthropic
```
Or if that was part of onboarding, select `setup-token` when prompted.

**⚠️ CRITICAL: The token MUST be pasted as a single line. No line breaks.**

**c) Verify:**
```bash
openclaw models status
```
Should show the anthropic profile with `static` status.

**d) Check auth storage exists:**
```bash
find ~/.openclaw -name "auth-profiles.json"
```
Should return: `~/.openclaw/agents/main/agent/auth-profiles.json`

If this file doesn't exist, run `openclaw doctor --fix` — it may need to create the directory.

### ⚠️ CRITICAL: Multiple auth profiles cause 401 errors!

If onboarding or repeated setup attempts create **multiple** auth profiles for Anthropic (e.g. `dc-main`, `manual`, `default`), the gateway tries them in order. If the first one is invalid, you'll see a 401 error flash even though a later profile works.

**Fix: Keep only ONE Anthropic auth profile.**

1. Check what profiles exist: `openclaw models status`
2. Edit `~/.openclaw/openclaw.json` directly (nano/vim)
3. In the `auth.profiles` section, remove all Anthropic entries EXCEPT the working one (usually `anthropic:default`)
4. In the `auth.order.anthropic` array, remove references to deleted profiles
5. Restart: `openclaw gateway restart`

**There is NO CLI command to remove auth profiles** (as of Feb 2026). You must edit the JSON manually.

### Token per-device

Each machine needs its own `claude setup-token` run. The token generated on Machine A may not work on Machine B. Always generate fresh on each device.

### Same Claude account on multiple machines

Using the same Claude Max account on multiple OpenClaw instances is fine. Just run `claude setup-token` on each machine separately and paste each machine's own token into its own OpenClaw config.

## 5. Google Services (GOG CLI)

```bash
brew install steipete/tap/gogcli   # or download binary for Linux
gog auth credentials set /path/to/google-oauth-credentials.json
gog auth add account@gmail.com --services gmail,calendar,drive,contacts,docs,sheets
```

Requires Google Cloud project with:
- OAuth consent screen configured (External, with test user added)
- APIs enabled: Gmail, Calendar, Drive, Contacts, Sheets, Docs
- OAuth client ID (Desktop app type), credentials JSON downloaded

See `memory/openclaw-setup.md` → Google Services section.

## 6. Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| 401 invalid bearer token | Bad/expired token, or multiple conflicting auth profiles | Remove extra profiles from openclaw.json, keep one working one. Regenerate with `claude setup-token` if needed |
| 401 but logs show retry succeeds | First auth profile is bad, second works | Remove the bad profile from openclaw.json |
| `claude` not found | Not in PATH | `find ~ -name "claude" 2>/dev/null`, then add dir to ~/.bashrc |
| `openclaw` not found | npm global bin not in PATH | See step 2 |
| `openclaw doctor` asks to create oauth directory | Auth storage dir missing | Say yes, then re-run setup-token |
| 403 during Google OAuth | Consent screen not configured or test user not added | Add email as test user in Cloud Console → OAuth consent screen |
| Config broken after manual edit | Bad JSON | `openclaw doctor --fix` or `openclaw onboard --reset` for nuclear option |

## 7. Troubleshooting Checklist

When something goes wrong, run these in order:
```bash
openclaw status
openclaw models status
openclaw doctor
openclaw logs --follow
```

Then type a message and watch the logs for the exact error.

## 8. Files & Paths (Linux)

| What | Path |
|------|------|
| OpenClaw config | `~/.openclaw/openclaw.json` |
| Auth profiles (secrets) | `~/.openclaw/agents/main/agent/auth-profiles.json` |
| Sessions | `~/.openclaw/agents/main/sessions/` |
| Workspace | `~/.openclaw/workspace/` |
| Logs | `/tmp/openclaw/openclaw-YYYY-MM-DD.log` |
| Config backup | `~/.openclaw/openclaw.json.bak` |

## 9. QMD Vector Memory (BM25 + Vectors + Reranking)

QMD gives massively better memory search — combines keyword matching (BM25), semantic vector search, and AI reranking. Runs fully locally, no API costs.

### Prerequisites

**macOS:**
```bash
brew install oven-sh/bun/bun
brew install sqlite  # needed for extension loading
npm install -g tsx    # TypeScript execution for Node
```

**Linux (Debian/Ubuntu):**
```bash
# Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# SQLite with dev headers (for sqlite-vec extension)
sudo apt install sqlite3 libsqlite3-dev

# Node.js (>= 22) — if not already installed
# tsx for TypeScript execution
npm install -g tsx
```

### Install QMD

```bash
bun install -g https://github.com/tobi/qmd

# Trust blocked postinstalls
cd $(bun pm -g bin)/../install/global && bun pm untrusted
bun pm trust node-llama-cpp @tobilu/qmd
```

### ⚠️ CRITICAL: Bun's SQLite Can't Load Extensions

Bun's built-in `bun:sqlite` does NOT support `loadExtension()`, which sqlite-vec requires for vector storage. The fix is to run QMD via **Node + better-sqlite3** instead:

```bash
# Install better-sqlite3 in the QMD package
cd ~/.bun/install/global/node_modules/@tobilu/qmd
npm install better-sqlite3
```

Then **patch the qmd binary** to use Node instead of Bun:

**macOS version** (`~/.bun/bin/qmd`):
```bash
#!/usr/bin/env bash
set -euo pipefail
QMD_ROOT="$HOME/.bun/install/global/node_modules/@tobilu/qmd"
exec node --import /opt/homebrew/lib/node_modules/tsx/dist/esm/index.mjs "$QMD_ROOT/src/qmd.ts" "$@"
```

**Linux version** (`~/.bun/bin/qmd`):
```bash
#!/usr/bin/env bash
set -euo pipefail
QMD_ROOT="$HOME/.bun/install/global/node_modules/@tobilu/qmd"
# Adjust tsx path — find it with: find / -name "index.mjs" -path "*/tsx/dist/esm/*" 2>/dev/null
TSX_PATH="$(npm root -g)/tsx/dist/esm/index.mjs"
exec node --import "$TSX_PATH" "$QMD_ROOT/src/qmd.ts" "$@"
```

Make executable: `chmod +x ~/.bun/bin/qmd`

### Verify Installation

```bash
export PATH="$HOME/.bun/bin:$PATH"
qmd --help       # Should show usage
qmd status       # Should show empty index
```

### Index Your Workspace

```bash
# Create a collection pointing at the workspace
qmd collection add ~/.openclaw/workspace --name workspace --mask "**/*.md"

# Generate vector embeddings (first run downloads ~330MB GGUF model)
# Use nohup for long-running embed — don't let terminal timeouts kill it!
nohup qmd embed > /tmp/qmd-embed.log 2>&1 &
tail -f /tmp/qmd-embed.log  # Watch progress
```

Embedding takes ~4-6 minutes for 600+ files on Apple Silicon. May be slower on Linux without GPU.

### Configure OpenClaw to Use QMD

Add to `~/.openclaw/openclaw.json`:

```json
{
  "memory": {
    "backend": "qmd",
    "citations": "auto",
    "qmd": {
      "command": "/home/YOUR_USER/.bun/bin/qmd",
      "includeDefaultMemory": true,
      "searchMode": "search",
      "update": {
        "interval": "5m",
        "debounceMs": 15000,
        "onBoot": true,
        "waitForBootSync": false
      },
      "limits": {
        "maxResults": 8,
        "timeoutMs": 5000
      },
      "scope": {
        "default": "deny",
        "rules": [
          { "action": "allow", "match": { "chatType": "direct" } }
        ]
      }
    }
  }
}
```

Then restart: `openclaw gateway restart`

### Test It

After restart, `memory_search` results should show `"provider": "qmd"`. The index auto-refreshes every 5 minutes. To force a refresh:

```bash
qmd update && qmd embed
```

### What QMD Downloads (First Run)

| Model | Size | Purpose |
|-------|------|---------|
| embeddinggemma-300M (GGUF) | ~330MB | Vector embeddings |
| Qwen3-Reranker-0.6B (GGUF) | ~700MB | Result reranking (on first `qmd query`) |
| qmd-query-expansion-1.7B (GGUF) | ~1.5GB | Query expansion (on first `qmd query`) |

Only the embedding model is needed for `qmd search` mode (which is what OpenClaw uses by default). The reranker and query expansion models download on first `qmd query` call.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `sqlite-vec is not available` | You're running via Bun — patch the binary to use Node (see above) |
| `Module not found` on embed | Make sure `better-sqlite3` is installed in QMD's node_modules |
| Embed killed/crashes | Run with `nohup` in background — don't rely on terminal session |
| Slow embedding on Linux | No GPU acceleration — expect 10-15 mins for 600 files |
| `qmd: command not found` | Add `~/.bun/bin` to PATH in ~/.bashrc |

## 10. Exec Timeout & SIGKILL Issues

OpenClaw's `exec` tool has a default timeout. Long-running processes (like `qmd embed` or large downloads) get SIGKILLed when they exceed it.

**Solutions:**
- For long processes, use `nohup command > /tmp/logfile.log 2>&1 &` and monitor with `tail`
- Use `yieldMs` parameter to background the exec and poll later
- For downloads, prefer `background: true` exec mode
- Never run `qmd embed` or large model downloads in a foreground exec — always background them

---

*Created: 2026-02-16 | Updated: 2026-02-16 — added QMD vector memory setup (Section 9), exec timeout notes (Section 10)*
