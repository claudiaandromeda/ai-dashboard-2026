# Projects Index

Quick-reference index of all projects. For deep detail, see each project's folder.

---

## 🔴 High Priority

### EmotivX — Digital Sports Art Platform
- **Location:** `projects/emotivx-app/`, `projects/emotivx-docs/`, `projects/emotivx-dvlt-partnership/`
- **What:** Converts real sports moments into premium digital art/merchandise
- **Key terminology:** "Digital Souvenirs" / "Deems" — NEVER say "NFT"
- **Hard Floor:** Minimum real-world value on every digital asset (prevents crash)
- **Revenue split:** Physical 50/50, Digital 80/20 (favour partner), Secondary 10% royalty
- **Trial club:** Wrexham (financial model in Drive)
- **App status:** Restyled (pure black/#DA291C red), gallery page, NIL verification engine built
- **GitHub:** David's repo `emotivx_app` (private). Forked to claudiaandromeda (as `emotivx_app-1`), cloned locally with upstream remote. `emotivx-backup` is empty.
- **Database:** Supabase connected but ZERO tables — needs anon key from David
- **Art styles:** DataLine (p5.js), Stadium Art (AI), Silhouette (AI) — David prefers silhouette with club colours + stadium context
- **Art direction:** Colours MUST be club-driven, celebratory sports art (not military/camo)
- **Knowledge base:** `projects/emotivx-docs/KNOWLEDGE_BASE.md`
- **Google Drive:** 5 subfolders, 23+ docs downloaded to `projects/emotivx-dvlt-partnership/drive-docs/`

### EmotivX — DVLT Partnership
- **Assessment:** `projects/emotivx-dvlt-partnership/DVLT_PARTNERSHIP_ASSESSMENT.md`
- **DVLT = formerly WiSA Technologies** — reverse split 1:150, CEO bought own company's IP for $210M stock
- **IBM Platinum = purchased $5M consulting contract** — DVLT is customer, IBM is vendor. Zero IBM press about DVLT.
- **Financials:** $1.7M cash, $8.4M/month burn, $378M accumulated deficit
- **Recommendation:** Zero-cost tech partnership, build independently, DVLT as nice-to-have
- **Red lines:** No cash, no DVLT equity, no exclusivity, no IP assignment, no launch dependency
- **Critical date:** March 31, 2026 — audited 10-K filing
- **8 research reports** totalling ~180KB at `projects/emotivx-dvlt-partnership/`

### EmotivX — Image Pipeline (CRITICAL, active research)
- **Problem:** Must convert real sports footage → premium art, preserving poses, removing branding
- **What works:** Flux (uncensored, high quality, text-to-image only), Gemini img2img (works on clean inputs)
- **What doesn't:** Gemini blocked by Premier League branding, Flux can't do reference conditioning, OpenAI blocks ~70% of sports attempts
- **Research:** 6 agents launched overnight Fri 13→Sat 14 Feb — see `projects/research/`
- **Next step:** Work through `research/tomorrow-test-plan.md`, test ControlNet + ComfyUI
- **Stakes:** Without this pipeline, EmotivX cannot deliver its core product

### M8TRX / Volcano Lottery — Telegram Perpetual Lottery
- **Location:** `projects/m8trx/`
- **Naming:** M8TRX = the company. Volcano Lottery = the product name. "Volcano" is what we call it.
- **GitHub:** David's repo `M8TRX-PoC` (Joe's PoC), also `BetDaveVolcano` (David's first attempt). Both forked to claudiaandromeda, cloned locally with upstream remotes.
- **Codebase:** 536 TS/TSX files, ~103K lines, NestJS + Next.js 15 + Prisma + Redis
- **Dev:** Joseph Arose (Joe) — friend, equity, originally $250K quote
- **Innovation:** WPN (Winning Pot Nanosecond) — genuinely novel, potentially patentable
- **Business model:** 2.4× pot multiplier, 16.7% house edge, white-label multi-tenant
- **Build status:** ~65-70% PFF, ~25-30% real money
- **Critical issues:** Auth always returns true, 2% test coverage, MLM referral = regulatory risk
- **Recommended path:** PFF launch (~£5K), build users, then Curaçao license (~€52K)
- **5 analysis docs** totalling 334KB at `projects/m8trx/`

### Kingfinity — Blockchain Gaming (Under Review)
- **Location:** `projects/kingfinity/`
- **Status:** Research complete, 5 reports ready — 3/10 viability, 3 showstoppers, CRITICAL legal risk

---

## 🟡 Active / In Progress

### AI Dashboard — SaaS Monitoring Tool (Venture #6)
- **Location:** `projects/ai-dashboard/`
- **Spec:** `projects/ai-dashboard/PRODUCT_SPEC.md`
- **Pricing:** Free / Pro £9.99 / Team £29.99 / Enterprise
- **Status:** Core built, needs real API integrations
- **Note:** Claude Max and Claude API are COMPLETELY SEPARATE billing/tracking

### ComfyUI + Flux — Local Image Generation
- **Location:** `projects/comfyui/`
- **Setup:** Flux Schnell FP8 (16GB), M4 Pro MPS GPU confirmed working
- **Performance:** ~15-30 sec/image, zero cost, no moderation
- **Status:** First successful generation confirmed — 4 images rendered

---

## 🟢 Planned / Early Stage

### Offline Arbitrage (PROVEN MODEL)
- Buy cheap online (Gumtree/FB), sell via printed adverts in care homes/supermarkets
- Mobility scooters: £200→£600, stairlifts potentially bigger
- Plan: `projects/ventures/offline-arbitrage/BUSINESS_IDEA.md`

### Duello — P2P Sports Betting App (ALREADY BUILT)
- **Location:** `projects/duello/`
- **GitHub:** David's repo `betdave-app` (private). Forked to claudiaandromeda, cloned locally with upstream remote.
- **What:** Peer-to-peer competition and prediction platform for live sports broadcasts
- **Key tech:** ADIO® Silent Triggers (inaudible tones in broadcasts trigger predictions), zero network requirement at point of detection
- **Status:** APP IS BUILT — not just planned. Thomas (David's son) also contributing
- **Regulatory:** Prediction/wagering = gambling regulation territory, needs separate licensing
- **Team:** David + Thomas (NOT Steve — keep separate from EmotivX)
- **Synergies:** Duello ↔ EmotivX (same fans, collect vs predict), Duello ↔ M8TRX (wagering/regulatory overlap), Duello ↔ DVLT (SanQtum infrastructure), Duello ↔ Genexxo (SPORTSXX domain)

### Genexxo — The Internet's Organising Layer
- **Location:** `projects/genexxo/`
- **Website:** genexxovision.com (redirects to genexxovision.com)
- **Company:** GENEXXO Vision Limited, incorporated Isle of Man (Co. No. 022622V)
- **What:** Sovereign digital infrastructure — 10,000+ domains with "XX" suffix across 45 commercial categories. 14 years in development.
- **Key tech:** Supernova Application (AI-driven discovery), Cognitive Anchors (SPORTSXX, TECHXX, HEALTHXX, FINANCEXX), "Data Refinery" workflow (Create → Serve → Realise)
- **Team:** David, Stu, Andrew, Sean (NOT Steve — keep separate from EmotivX)
- **DVLT integration:** Genexxo = discovery layer, DVLT = tokenisation/valuation engine. Domains become self-sustaining financial nodes.
- **DVLT financial claims:** $200M revenue target 2026, $2-3B by 2027 (100-city edge rollout). Backed by $150M bitcoin investment + $5M IBM engineering.
- **Status:** PARKED — focus is EmotivX first. To be pitched to DVLT separately after EmotivX is secured.
- **Synergies:** Genexxo ↔ EmotivX (SPORTSXX = gateway for sports data), Genexxo ↔ Duello (shared DVLT/SanQtum infrastructure), Genexxo ↔ DVLT (tokenisation of domain interactions)
- **Deep dive docs:** `projects/genexxo/drive-docs/`

### AI Consulting — `projects/ai-consulting/`
- **Research (16 Feb):** `research/uk-ai-consulting-market-2026.md` — £600-950/day Midlands, manufacturing underserved
- **R&D tax credits:** AI integration qualifies for 20% credit, most SMBs don't know → differentiator
- **Legal AI niche:** `research/ai-legal-sector-uk-2026.md` — DD + patent AI via David Pearce/Barker Brettell

### AI Due Diligence Service — NEW (16 Feb)
- **Research:** `research/unconventional-ai-monetisation-2026.md`, `research/ai-legal-sector-uk-2026.md`
- **Status:** PROVEN — Kingfinity 17K-word report demonstrated capability
- **Market:** $8.82B, 23.5% CAGR, 85-90% gross margins
- **Pricing:** £8-25K per engagement (vs £30-75K traditional DD)
- **Year 1 target:** £150-500K from 10-25 engagements
- **Entry:** David Pearce (Barker Brettell) as anchor, patent law crossover

### David + Thomas Partnership — NEW (16 Feb)
- **Research:** `research/father-son-business-dynamics.md`
- **Structure:** Ltd company recommended, 55/45 equity with 4-year vesting
- **Student finance:** Thomas loses ~£4-5K/year maintenance loans due to David's income
- **Tax:** Corporation tax more efficient, holding company once profits >£50K/year
- **Infrastructure:** `research/` folder has masterplan, shared architecture, collaboration, networking, OpenRouter config

### 3D Printing Services — `projects/3d-printing/`
- **Research (16 Feb):** `research/3d-printing-ai-business-2026.md` — AI quoting, Etsy validation, £4-8K startup

### AI Influencer Network — `projects/ai-influencer/`
### Automated Research Service — `projects/automated-research/`
### Branch End Garage — `projects/branch-end-garage/`

---

## Thomas's Projects & Opportunities
- **Career strategy:** `research/thomas-career-strategy-2026.md` — Cohere internship target Sept 2026, £45-57K grad salaries
- **Side income:** `research/thomas-side-income-ideas.md` — 20 ideas, CS tutoring + Docker consulting top picks
- **Portfolio plan:** `research/thomas-killer-portfolio-plan.md` — 4 killer projects, 12-month plan
- **Student app:** `research/thomas-student-productivity-app.md` — £2.99/month freemium, Newcastle-first
- **Steve superpowers:** `research/thomas-steve-superpowers.md` — 7 competitive advantages vs ChatGPT users
- **Digital nomad:** `research/thomas-digital-nomad-roadmap.md` — post-2027 plan, tax, visas, surf+tech
- **Investing:** `research/thomas-ai-investing-strategy.md` — ISA, ETF tools, FCA regs
- **Uni hacks:** `research/thomas-university-ai-hacks.md` — lecture pipeline, exam prep automation

---

## Full portfolio tracker: `VENTURES.md`

*Last updated: 2026-02-16 — added overnight research outputs, DD service, David+Thomas partnership, Thomas opportunities*

---

## YouTube Pipeline — Status Mar 2026
- **Purpose**: Nightly AI content intelligence briefing from 44 tracked YouTube channels
- **Status**: Running, 238+ summaries processed
- **Issues resolved**: Gemini merge was using non-existent CLI command (now uses REST API); Ollama timeouts doubled to 10min with retry logic; digest phase was timing out (cron now 1hr)
- **Outstanding**: Qwen3-TTS (c035, overdue), Duix.Heygem (c036)

## AI Clone Stack — Status Mar 2026
- **Goal**: Tess autonomous social media presence (80/20 AI/real split)
- **Research**: Complete. Qwen3-TTS + Duix.Heygem chosen over ElevenLabs/HeyGen
- **Status**: Installed not tested. Needs: voice sample from Tess (30s audio) + 15min video for avatar training

## OpenClaw Setup — Recent Changes
- Mem0 auto-capture installed on both bots (open-source mode, local)
  - Claudia: OpenAI embeddings (WORKING pending sqlite fix)
  - Elliot: Gemini embeddings (WORKING pending sqlite fix)
- SQLite/Node25 binding bug blocking Mem0 memory_store — investigating
- Both bots: Ollama GPU docs written, keep_alive=-1 configured
- Elliot: model aliases expanded from 5→9, memoryFlush added to compaction

---

## Deem Platform (David's IP — Separate Entity)
- **Status:** Vision & Architecture phase
- **Location:** `projects/deem-platform/`
- **What:** Redeemable digital twin platform — every physical product gets a Deem
- **IP:** David's personal IP, licensed exclusively to EmotivX for sports
- **Key docs:** `docs/vision.md`, `specs/tiers.md`, `specs/lifecycle.md`
- **PoC target:** Wrexham launch — Ryan Reynolds 1-of-1 Legendary Hoodie
- **Long-term:** White-labelable to gaming, music, film, theme parks, and more
