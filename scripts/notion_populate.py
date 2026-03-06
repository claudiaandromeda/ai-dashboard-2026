import os
#!/usr/bin/env python3
"""Notion Alvearium Deep Population Script"""

import json
import time
import urllib.request
import urllib.error

NOTION_KEY = os.environ.get("NOTION_API_KEY", "")
HEADERS = {
    "Authorization": f"Bearer {NOTION_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}

DB_TASKS = "316c36dd-a70f-811f-974b-ccda9d2ddb29"
DB_PROJECTS = "316c36dd-a70f-8186-a77e-ea16429786ef"
DB_TEAM = "316c36dd-a70f-81bc-abc7-d598c4b1c95a"
DB_DECISIONS = "316c36dd-a70f-8150-93df-cf9eab8e948a"
DB_KB = "316c36dd-a70f-811a-b60a-ec1b60413161"


def api_call(method, path, data=None):
    url = f"https://api.notion.com/v1{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR {e.code}: {body[:300]}")
        return None


def create_page(db_id, properties):
    result = api_call("POST", "/pages", {
        "parent": {"database_id": db_id},
        "properties": properties
    })
    time.sleep(0.4)
    return result


def title_prop(text):
    return {"title": [{"text": {"content": text[:2000]}}]}


def rt_prop(text):
    return {"rich_text": [{"text": {"content": str(text)[:2000]}}]}


def select_prop(val):
    return {"select": {"name": val}}


def date_prop(d):
    return {"date": {"start": d}}


# ===================== TEAM =====================
# Already in Team: Claudia, Stuart (Stu), Thomas, David, Elliot, Joseph (Joe), Clive, Tyrelle, Sue, Andrew, Sean
# Missing: Monty Munford, Steve (Cumming), Austin, Ian, William & James, Ben, Liv, Leo

missing_team = [
    {
        "Name": title_prop("Monty Munford"),
        "Role": select_prop("External"),
        "Platform": rt_prop("Tech journalist, investment consultant. Mob76. Forbes/Economist/CoinTelegraph. Facilitated 45+ companies raise €1.6bn exits. DVLT connection. Met David at IBM meeting Feb 11 2026 — 'house on fire'. Groucho Club meeting 24 Feb 2026."),
        "Notes": rt_prop("Wikipedia: https://en.wikipedia.org/wiki/Monty_Munford | HomeTruth proptech startup founder ($4M val). Deep crypto expertise (defrauded £25k Bitcoin). In DVLT's pocket per David — likely favourable press + introductions."),
        "Status": select_prop("Active"),
    },
    {
        "Name": title_prop("Steve Cumming"),
        "Role": select_prop("External"),
        "Platform": rt_prop("EmotivX co-founder. Full name: Stephen James Cumming (born Sept 1966). Owns significant equity. Brand connections: Chelsea FC, Diageo, Coca-Cola."),
        "Notes": rt_prop("WARNING: Has proved selfish/self-serving. Ran near-identical company EQUITBL/Dnizn liquidated 56 days before EmotivX incorporated. Concurrent role at Tomorrow Brands (conflict). Associated with Justin Mitchell Cohen (serial failures). DD report compiled 26 Feb 2026."),
        "Status": select_prop("Active"),
    },
    {
        "Name": title_prop("Austin"),
        "Role": select_prop("External"),
        "Platform": rt_prop("EmotivX co-founder. Owns equity, has LOI. Demonstrated image pipeline working 2022."),
        "Notes": rt_prop("LIABILITY: Demanded 40% equity, breached NBA exclusivity, did NOT attend DVLT meeting."),
        "Status": select_prop("Active"),
    },
    {
        "Name": title_prop("Ian"),
        "Role": select_prop("External"),
        "Platform": rt_prop("EmotivX-related contact. Situation pending — deprioritised after DVLT/IBM meeting Feb 2026."),
        "Notes": rt_prop("Details TBD — needs follow-up when capacity allows."),
        "Status": select_prop("Active"),
    },
    {
        "Name": title_prop("William & James"),
        "Role": select_prop("External"),
        "Platform": rt_prop("David's 17-year-old twin sons. Family members."),
        "Notes": rt_prop("Not involved in business projects."),
        "Status": select_prop("Active"),
    },
    {
        "Name": title_prop("Ben"),
        "Role": select_prop("External"),
        "Platform": rt_prop("David's youngest son, age 12. 'The brother from another mother' — family joke."),
        "Notes": rt_prop("Family member. Not involved in projects."),
        "Status": select_prop("Active"),
    },
    {
        "Name": title_prop("Liv"),
        "Role": select_prop("External"),
        "Platform": rt_prop("Sue's daughter (David's stepdaughter), age 19. Lives with David and Sue."),
        "Notes": rt_prop("Family member."),
        "Status": select_prop("Active"),
    },
    {
        "Name": title_prop("Leo"),
        "Role": select_prop("External"),
        "Platform": rt_prop("Sue's son (David's stepson), age 15. Lives with David and Sue."),
        "Notes": rt_prop("Family member."),
        "Status": select_prop("Active"),
    },
]

print("=== ADDING MISSING TEAM MEMBERS ===")
for member in missing_team:
    name = member["Name"]["title"][0]["text"]["content"]
    result = create_page(DB_TEAM, member)
    if result:
        print(f"  OK: {name}")
    else:
        print(f"  FAIL: {name}")

# ===================== KNOWLEDGE BASE =====================
new_kb_entries = [
    {
        "Topic": title_prop("DD Due Diligence Service — Business Plan"),
        "Category": select_prop("Business Intelligence"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("AI-powered due diligence service. Market: $8.82B, 23.5% CAGR. 85-90% gross margins. Pricing: £8-25K per engagement (vs £30-75K traditional DD). Year 1 target: £150-500K from 10-25 engagements. Entry: David Pearce at Barker Brettell (patent law crossover). Demonstrated capability: Kingfinity 17K-word report. Launch kit: research/dd-launch-kit.md"),
    },
    {
        "Topic": title_prop("AI Consulting Market UK 2026"),
        "Category": select_prop("Research"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("Day rate: £600-950/day in Midlands. Manufacturing sector underserved. R&D tax credits: AI integration qualifies for 20% credit — most SMBs unaware (key differentiator). Legal AI niche: DD + patent AI via David Pearce/Barker Brettell. Research: research/uk-ai-consulting-market-2026.md, research/ai-legal-sector-uk-2026.md"),
    },
    {
        "Topic": title_prop("Bot-in-a-Box Architecture & Commercial Model"),
        "Category": select_prop("Technical"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("Productised OpenClaw deployment template. Proven with Clive (Sue's bot): 14 min onboarding, full CV, 7 research ideas, SOUL.md+USER.md written. Commercial: B2C £20/mo, B2B white-label, agency model. Bug: name parsing ('My name is Sue' -> 'My'). Assets: onboarding_bot.py, BOOTSTRAP.md. Elliot can automate VPS provisioning. Files: memory/clive-breakthrough.md"),
    },
    {
        "Topic": title_prop("OpenClaw Fleet Architecture — 3-Bot Setup"),
        "Category": select_prop("Technical"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("Claudia (Mac mini M4 Pro, 55GB), Elliot (Linux, Titan X 12GB VRAM), Clive (Hostinger VPS). Mission Control dashboard: canvas/dashboard.html. State.json polled every 15min via cron. SSH: Claudia->Elliot (192.168.0.85). 2-way SSH planned. Mem0 cloud activated both bots (2026-03-01). Shared knowledge: github.com/claudiaandromeda/shared-knowledge"),
    },
    {
        "Topic": title_prop("Tyrelle AI Clone Project"),
        "Category": select_prop("Technical"),
        "Status": select_prop("Active"),
        "Content": rt_prop("Client: Tyrelle (YouTube crypto/AI creator, Tess's friend). Paying client. Goal: AI clone for autonomous social media. Outputs: tyrelle-icl-output.wav (0.6B ICL, approved), tyrelle-1.7b-output.wav (31MB, 1.7B). Persona card: research/tyrelle-persona.md — Cockney dialect, TH-fronting, G-dropping. Next: F5-TTS on Mac mini MPS. Stack: Claude script + F5-TTS + Duix.Heygem + Kling + auto-post."),
    },
    {
        "Topic": title_prop("Genexxo Vision — Domain Portfolio Strategy"),
        "Category": select_prop("Business Intelligence"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("10,000+ 'XX' suffix domains across 45 commercial categories. 14 years in development. GENEXXO Vision Limited, Isle of Man (Co. No. 022622V). Key: Supernova Application, Cognitive Anchors (SPORTSXX/TECHXX/HEALTHXX/FINANCEXX). Team: David, Stu, Andrew, Sean. DVLT integration: Genexxo=discovery, DVLT=tokenisation. Status: PARKED — EmotivX first."),
    },
    {
        "Topic": title_prop("Offline Arbitrage — Proven Business Model"),
        "Category": select_prop("Business Intelligence"),
        "Status": select_prop("Active"),
        "Content": rt_prop("Buy cheap online (Gumtree/FB Marketplace), sell via printed adverts in care homes/supermarkets. Mobility scooters: £200->£600. Stairlifts: potentially larger margins. Zero tech required. Proven model. Plan: projects/ventures/offline-arbitrage/BUSINESS_IDEA.md. Efficiency: tackle all reselling categories at car boot simultaneously."),
    },
    {
        "Topic": title_prop("Qwen3-TTS Voice Cloning — Technical Findings"),
        "Category": select_prop("Technical"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("Tested 2026-03-01 on Elliot's Titan X GPU. 0.6B ICL mode: approved by Tess. 1.7B ICL: 31MB output, 655s CPU inference. x_vector_only rejected (too Jamaican). Key lesson: write scripts in NORMAL English, use ref audio for accent, G-dropping in text OK. F5-TTS on Mac mini (MPS) recommended for higher quality. Ref: tyrelle-ref-clean.wav (20s)."),
    },
    {
        "Topic": title_prop("Father-Son Business Partnership — David & Thomas"),
        "Category": select_prop("Research"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("Recommended: Ltd company, 55/45 equity with 4-year vesting. Student finance impact: Thomas loses ~£4-5K/year maintenance loans. Tax: Corporation tax more efficient; holding company once profits >£50K/year. Thomas career: Cohere internship target Sept 2026, £45-57K grad salaries. Research: research/father-son-business-dynamics.md"),
    },
    {
        "Topic": title_prop("OpenClaw Revenue Opportunities"),
        "Category": select_prop("Business Intelligence"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("Monetisation angles: (1) Bot-in-a-Box £300-500 setup + £50-100/mo; (2) AI consulting £600-950/day; (3) Research service £8-25K/engagement; (4) YouTube Intelligence Pipeline bundled; (5) AI Influencer network. Full analysis: research/openclaw-money-opportunities.md. Business plan: research/openclaw-business-plan.md."),
    },
    {
        "Topic": title_prop("LLM Trading Strategy — Research Spec"),
        "Category": select_prop("Research"),
        "Status": select_prop("Pending"),
        "Content": rt_prop("Goal: real backtested LLM/AI trading strategy using local LLMs + market data APIs (Yahoo Finance/Alpaca/Binance). Paper trade first. Academic papers + quant blogs (not YouTube). CrossTheRubicon archived — pure crypto hype. Output: actionable spec for local LLM trading signal generator. Commitment c029."),
    },
    {
        "Topic": title_prop("Duello — ADIO Silent Triggers Technology"),
        "Category": select_prop("Technical"),
        "Status": select_prop("Active"),
        "Content": rt_prop("APP IS BUILT. P2P prediction platform for live sports. ADIO inaudible tones in broadcasts trigger predictions with zero network requirement at detection point. Potentially patentable. Regulatory: UKGC gambling territory. Team: David + Thomas (NOT Steve Cumming). GitHub: betdave-app (private). Thomas contributing. Synergies: EmotivX, M8TRX, DVLT SanQtum."),
    },
    {
        "Topic": title_prop("DVLT Financial Red Flags — Due Diligence"),
        "Category": select_prop("Business Intelligence"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("DVLT = formerly WiSA Technologies. Reverse split 1:150. CEO bought own company IP for $210M stock. IBM Platinum = purchased $5M consulting contract (DVLT is customer, NOT partner). Financials: $1.7M cash, $8.4M/month burn, $378M accumulated deficit. Critical: March 31 2026 audited 10-K. Red lines: no cash, no DVLT equity, no exclusivity, no IP assignment."),
    },
    {
        "Topic": title_prop("ComfyUI + Flux — Local Image Generation Setup"),
        "Category": select_prop("Technical"),
        "Status": select_prop("Active"),
        "Content": rt_prop("Mac mini M4 Pro. Flux Schnell FP8 (16GB). MPS GPU confirmed working. Performance: 15-30 sec/image, zero cost, no moderation. 4 images generated successfully. Use cases: EmotivX art, AI Influencer content, Genexxo imagery. Next: ControlNet + ComfyUI for EmotivX image conditioning pipeline (commitment c010)."),
    },
    {
        "Topic": title_prop("Kingfinity Due Diligence — 3/10 Viability"),
        "Category": select_prop("Research"),
        "Status": select_prop("Complete"),
        "Content": rt_prop("Blockchain gaming project. 3 showstoppers found, CRITICAL legal risk. 5 research reports ~17K words total. Outcome: recommended against proceeding. Value: demonstrated DD capability — became launch case study for DD service. Sean's friend's project. Outcome communicated to David."),
    },
]

print("\n=== ADDING KNOWLEDGE BASE ENTRIES ===")
for entry in new_kb_entries:
    topic = entry["Topic"]["title"][0]["text"]["content"]
    result = create_page(DB_KB, entry)
    if result:
        print(f"  OK: {topic}")
    else:
        print(f"  FAIL: {topic}")

# ===================== DECISIONS =====================
new_decisions = [
    {
        "Decision": title_prop("Elliot model stack: haiku primary, ollama agent default"),
        "Category": select_prop("Infrastructure"),
        "Date": date_prop("2026-03-01"),
        "Rationale": rt_prop("Discord/Telegram: anthropic/claude-haiku-4-5. Agent default (background/pipeline): ollama/mistral:7b. Fallbacks: gemini-2.5-flash -> gemini-3.1-pro-preview -> ollama. Web UI: Sonnet/Opus manually. Prevents OpenRouter cap exhaustion."),
    },
    {
        "Decision": title_prop("Test models in Discord before adding to fallback chain"),
        "Category": select_prop("Infrastructure"),
        "Date": date_prop("2026-02-27"),
        "Rationale": rt_prop("No model added to fallback without Discord test: quality, verbosity, rule-following, consistency. Approved fallback: gemini-3.1-pro -> haiku -> kimi-k2.5 -> mistral-large -> sonnet. To test: deepseek-chat, mistral-small, minimax-m2.5."),
    },
    {
        "Decision": title_prop("Bot-in-a-Box parked until DVLT/RL projects resolved"),
        "Category": select_prop("Business"),
        "Date": date_prop("2026-02-27"),
        "Rationale": rt_prop("Viable revenue (£300-500 setup + £50-100/mo) but parked until David has bandwidth. DVLT + M8TRX PFF + EmotivX image pipeline are higher priority. Re-evaluate when main projects secured."),
    },
    {
        "Decision": title_prop("Two-way SSH between Claudia and Elliot for emergency recovery"),
        "Category": select_prop("Infrastructure"),
        "Date": date_prop("2026-03-01"),
        "Rationale": rt_prop("Claudia->Elliot works (192.168.0.85). Elliot->Claudia needed for emergency. Plan: key on Elliot, add to Claudia authorized_keys. Minimal privileges, audit log."),
    },
    {
        "Decision": title_prop("Bot collab: [ISSUE] tag + dedicated channel"),
        "Category": select_prop("Infrastructure"),
        "Date": date_prop("2026-02-26"),
        "Rationale": rt_prop("Inter-bot communication: [ISSUE] tag for genuine problems (1 message, no ping-pong). Dedicated #bot-collab channel with relaxed limits. Both bots with problems simultaneously -> Telegram alert to Tess. Implement after Tess approves design."),
    },
    {
        "Decision": title_prop("Rotate Clive tokens — exposed in Telegram during setup"),
        "Category": select_prop("Security"),
        "Date": date_prop("2026-02-23"),
        "Rationale": rt_prop("Bot token + OpenRouter key pasted in Telegram chat ~16:23 and 20:38 GMT. Rotate: (1) BotFather revoke; (2) OpenRouter delete+new; (3) Update VPS .env + systemd. David: worst case $40 if leaked, limits set."),
    },
    {
        "Decision": title_prop("ADIO triggers: keep patent-confidential, separate from EmotivX"),
        "Category": select_prop("Business"),
        "Date": date_prop("2026-02-15"),
        "Rationale": rt_prop("Duello's ADIO Silent Triggers are genuinely novel and potentially patentable. Keep completely separate from Steve Cumming/EmotivX. David + Thomas own this. Do not share in any EmotivX discussions."),
    },
    {
        "Decision": title_prop("Volcano Lottery WPN mechanism — formalise IP before funding"),
        "Category": select_prop("Business"),
        "Date": date_prop("2026-02-15"),
        "Rationale": rt_prop("WPN (Winning Pot Nanosecond) is genuinely novel — potentially patentable. Currently verbal agreement: all founders own equally. Must formalise via Ltd before any external funding approach."),
    },
]

print("\n=== ADDING DECISIONS ===")
for dec in new_decisions:
    title = dec["Decision"]["title"][0]["text"]["content"]
    result = create_page(DB_DECISIONS, dec)
    if result:
        print(f"  OK: {title}")
    else:
        print(f"  FAIL: {title}")

# ===================== ADDITIONAL TASKS =====================
new_tasks = [
    {
        "Task": title_prop("Fix YouTube nightly pipeline cron — missed 3+ consecutive nights"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("Elliot"),
        "Priority": select_prop("High"),
        "Project": select_prop("YouTube Pipeline"),
        "Notes": rt_prop("No /tmp/yt-pipeline-nightly.log found since Feb 28. Dream-cycle.py not triggering it. Force-rerun stalled 72h+ on 'Claude Code Changed How I Work Forever' (chunk 2/2, Ollama OOM). Investigate: OpenClaw cron registration, add skip-video logic for OOM failures."),
    },
    {
        "Task": title_prop("Fix retrospective pipeline script — wrong CLI args"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("Elliot"),
        "Priority": select_prop("Medium"),
        "Project": select_prop("YouTube Pipeline"),
        "Notes": rt_prop("Throws: unrecognized arguments: --max-videos 30 --max-age-days 14. Broken since Feb 27. Fix args to match current youtube-nightly.py API."),
    },
    {
        "Task": title_prop("Install F5-TTS on Mac mini for Tyrelle voice cloning"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("Claudia"),
        "Priority": select_prop("High"),
        "Project": select_prop("TyrelleAI"),
        "Notes": rt_prop("Python 3.11 venv at workspace/venvs/tts-env. MPS acceleration on Mac mini (55GB unified memory). Better English accent quality than Qwen3-TTS CPU. Ref audio: tyrelle-ref-clean.wav, tyrelle-ref-casual.wav."),
    },
    {
        "Task": title_prop("Set up Elliot Telegram account"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("David"),
        "Priority": select_prop("Medium"),
        "Project": select_prop("Infrastructure"),
        "Notes": rt_prop("Tess has SIM card for Elliot (2026-03-01). Set up once SIM active. Use: emergency recovery + group testing vs Discord."),
    },
    {
        "Task": title_prop("Fix Elliot Anthropic OAuth — API key not persisting on Linux"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("David"),
        "Priority": select_prop("High"),
        "Project": select_prop("Infrastructure"),
        "Notes": rt_prop("Token named 'default' in Anthropic console but not persisting. Linux has no keychain. Credentials: /home/elliot/.openclaw/credentials/ only has Discord files. Fix: send API key via Telegram DM -> write to Elliot .env/auth config directly."),
    },
    {
        "Task": title_prop("Mission Control v2 — per-bot model routing and token dashboard"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("Claudia"),
        "Priority": select_prop("Medium"),
        "Project": select_prop("Mission Control"),
        "Notes": rt_prop("Spec: current model, routing table, token usage, cost per bot. Fleet total combined cost. OAuth cost: £180/mo Max / 2 bots / 31 days = ~£2.90/day/bot. Alerts: Discord + Telegram on rate threshold breach. Daily report cron."),
    },
    {
        "Task": title_prop("Fix force-rerun stall — add skip logic for OOM videos"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("Elliot"),
        "Priority": select_prop("Medium"),
        "Project": select_prop("YouTube Pipeline"),
        "Notes": rt_prop("Force-rerun stalled 72+ hours on same video (25,247 chars, chunk 2/2). Persistent Ollama OOM/timeout. Need: skip-video logic (add to failed list after N retries), or chunk size reduction."),
    },
    {
        "Task": title_prop("Formalise David + Joe IP agreement for Volcano Lottery"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("David"),
        "Priority": select_prop("High"),
        "Project": select_prop("Duello"),
        "Notes": rt_prop("Currently verbal: all founders own equally. WPN mechanism may be patentable. Must formalise via Ltd before any external funding. Joe (Joseph Arose) is equity partner."),
    },
    {
        "Task": title_prop("Archive CrossTheRubicon YouTube summaries"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("Elliot"),
        "Priority": select_prop("Low"),
        "Project": select_prop("YouTube Pipeline"),
        "Notes": rt_prop("47 summaries from @CrossTheRubicon — pure crypto hype, not AI. Channel removed from youtube-channels.json. Move to research/summaries/archived-crossrubicon/ to avoid polluting main library."),
    },
    {
        "Task": title_prop("Research Kling 3.0 AI Director for B-roll generation"),
        "Status": select_prop("To Do"),
        "Assignee": select_prop("Claudia"),
        "Priority": select_prop("Medium"),
        "Project": select_prop("TyrelleAI"),
        "Notes": rt_prop("Tess has Kling tokens. B-roll for Tyrelle AI clone content pipeline. Assess: quality, credit cost, API access, fit for autonomous posting workflow."),
    },
    {
        "Task": title_prop("Scatter David's mum's ashes — Lake District (memorial)"),
        "Status": select_prop("Done"),
        "Assignee": select_prop("David"),
        "Priority": select_prop("High"),
        "Project": select_prop("Infrastructure"),
        "Notes": rt_prop("Memorial trip to Lake District, weekend of 22-23 Feb 2026. Her favourite place. Completed."),
    },
    {
        "Task": title_prop("Monty Munford meeting — The Groucho Club"),
        "Status": select_prop("Done"),
        "Assignee": select_prop("David"),
        "Priority": select_prop("High"),
        "Project": select_prop("EmotivX"),
        "Notes": rt_prop("Meeting at The Groucho Club, 4pm 24 Feb 2026. Social/boozy. No pitch. Relationship building with DVLT connection. David and Monty got on brilliantly at IBM meeting Feb 11."),
    },
    {
        "Task": title_prop("Sue Clive bot onboarding — first live run"),
        "Status": select_prop("Done"),
        "Assignee": select_prop("Claudia"),
        "Priority": select_prop("High"),
        "Project": select_prop("Bot-in-a-Box"),
        "Notes": rt_prop("2026-02-23: Flawless. 14 minutes, full CV, 7 tailored research ideas, SOUL.md+USER.md written. Proved Bot-in-a-Box concept. David: 'possibly more potential than DVLT meeting tomorrow'. Files: memory/clive-breakthrough.md"),
    },
    {
        "Task": title_prop("Mission Control fleet monitoring — build and go live"),
        "Status": select_prop("Done"),
        "Assignee": select_prop("Claudia"),
        "Priority": select_prop("High"),
        "Project": select_prop("Mission Control"),
        "Notes": rt_prop("Built 2026-02-23. OpenRouter API tracks Claudia + Elliot spend. state.json polled every 15min via cron. Dashboard at canvas/dashboard.html. Clive added to fleet. SSH key clive_vps_ed25519."),
    },
    {
        "Task": title_prop("Shared GitHub repo for Claudia + Elliot knowledge base"),
        "Status": select_prop("Done"),
        "Assignee": select_prop("Claudia"),
        "Priority": select_prop("High"),
        "Project": select_prop("Infrastructure"),
        "Notes": rt_prop("Repo: github.com/claudiaandromeda/shared-knowledge (private). Elliot invited (elliotandromeda). Initial structure: README + shared/INFRASTRUCTURE.md. Created 2026-02-23."),
    },
]

print("\n=== ADDING ADDITIONAL TASKS ===")
for task in new_tasks:
    name = task["Task"]["title"][0]["text"]["content"]
    result = create_page(DB_TASKS, task)
    if result:
        print(f"  OK: {name}")
    else:
        print(f"  FAIL: {name}")

print("\n=== POPULATION COMPLETE ===")
print(f"Attempted: {len(missing_team)} team + {len(new_kb_entries)} KB + {len(new_decisions)} decisions + {len(new_tasks)} tasks")
