# Elliot — Ollama GPU Setup & Troubleshooting

**Machine:** Linux (Ubuntu), Nvidia Titan X (12GB VRAM)
**Model:** `mistral:7b`
**Ollama path:** `/usr/local/bin/ollama`

---

## Configuration

### Keep model in VRAM (avoid reload cost)
Config at `/home/elliot/.ollama/config.json`:
```json
{
  "keep_alive": -1,
  "num_gpu": 1
}
```
`-1` = keep loaded indefinitely (until manually unloaded or service restart).  
Also set per-run via env: `OLLAMA_KEEP_ALIVE=-1 ollama run mistral:7b ...`

### Systemd service
Located at `/usr/lib/systemd/system/ollama.service`.  
Restart: `ps aux | grep ollama | grep -v grep | awk '{print $2}' | xargs kill && sleep 2 && ollama serve &`  
(No sudo access for service restart via SSH — use process kill method above.)

---

## Monitoring

```bash
# Check GPU usage
nvidia-smi

# Check which model is loaded
curl -s http://localhost:11434/api/ps | python3 -m json.tool

# Check Ollama is running
curl -s http://localhost:11434/api/tags | python3 -c "import json,sys; [print(m['name']) for m in json.load(sys.stdin)['models']]"
```

---

## YouTube Pipeline

Script: `~/.openclaw/shared-knowledge/scripts/youtube-nightly.py`  
Run nightly via cron at 2am Europe/London.  

Per-video timeout: 600s (10 min). If Ollama hangs, it prints a skip message and continues.  
Routing logic:
- ≤15K chars → single-pass Ollama
- 15K–120K chars → chunked Ollama + Gemini merge
- >120K chars → flagged for manual review

Force reprocess: `--force` flag  
Cap videos: `--max-total 20` (default for nightly cron to ensure digest completes)

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Ollama hangs mid-inference | GPU OOM or model reloading | Check `nvidia-smi`, restart ollama process |
| "connection refused" on port 11434 | Ollama service not running | `ollama serve &` |
| Pipeline times out silently | SIGTERM before digest step | `--max-total 20` cap already in cron |
| Gemini merge falls back to concatenation | Missing GEMINI_API_KEY | Check `~/.openclaw/.env` has `GEMINI_API_KEY` |

---

## Model Management

```bash
# List downloaded models
ollama list

# Pull a model
ollama pull mistral:7b

# Remove a model
ollama rm <model>

# Check running models
ollama ps
```

---

*Last updated: 2026-03-01*
