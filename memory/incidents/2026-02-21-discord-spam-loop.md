# INCIDENT REPORT: Discord Spam Loop (Feb 21-22, 2026)

**Date:** 2026-02-21 to 2026-02-22  
**Severity:** HIGH  
**Status:** Resolved (machine shutdown), root cause under investigation  
**Reporter:** David (Tess)

---

## Summary

On Saturday morning (Feb 22), Elliot's machine began repeatedly posting messages to Discord and could not be stopped without remote shutdown. The incident occurred after 3 nights of silent infrastructure failures.

---

## Timeline

### Thursday Feb 19, 11:11 PM
- YouTube Intelligence Pipeline deployed (1am cron)
- Dream Cycle script created but **never added to crontab** ❌
- Both expected to run autonomously

### Friday Feb 20, 1:00 AM
- **YouTube Pipeline FAILED**: `ModuleNotFoundError: No module named 'yaml'`
- Pipeline output duplicated (running twice per cron?)
- No alert sent, failure silent

### Friday Feb 20 (daytime)
- Gateway restarted multiple times (Telegram provider restarts in logs)
- **No daily log created** (no human sessions recorded)

### Friday Feb 21, ~9:04 AM
- Someone addressed "posting issue to Discord"
- Gateway was stopped, then restarted
- Security audit run (found 2 warnings)
- **Response duplicated** - same message posted twice back-to-back

### Friday Feb 21, 1:00 AM  
- **YouTube Pipeline FAILED** again (same yaml error)
- Dream Cycle never ran (not in crontab)

### Friday Feb 21, 11:40 PM
- Discord WebSocket connections began failing (code 1005)
- Pattern: `Attempting resume with backoff: 1000ms` → immediate disconnect
- Continued every few seconds throughout the night

### Friday Feb 21, 11:58 PM
- Something began repeatedly trying to restart the gateway
- Error: `"Gateway failed to start: gateway already running (pid 5150)"`
- Loop: failed restart attempt every 10 seconds

### Saturday Feb 22, 1:00 AM
- **YouTube Pipeline FAILED** (third night, same yaml error)
- Discord connection still failing continuously
- Claudia's machine: no messages actually sent, just connection failures

### Saturday Feb 22, early AM (exact time unknown)
- **Elliot's machine began spam-posting to Discord** 
- Could not be stopped via normal means
- David remotely shut down Elliot's machine to stop the loop

### Saturday Feb 22, 9:15 AM
- Claudia's gateway still running
- Discord connection established successfully
- **No daily log created for Feb 20, 21, or 22**

---

## Root Cause Analysis (Preliminary)

### Confirmed Issues

1. **YouTube Pipeline Broken (3 nights)**
   - Missing `yaml` Python module (now installed, unclear when)
   - Cron script appears to run twice per execution (duplicated output)
   - No error alerting/monitoring

2. **Dream Cycle Never Deployed**
   - Script created Feb 19 at 11:10pm
   - Feb 19 daily log states: "✅ Cron set for 2:30am nightly"
   - **But cron was never actually set** ❌
   - Current crontab only has YouTube pipeline (1am)

3. **Discord Gateway Failure Loop (Claudia)**
   - WebSocket code 1005 errors (empty close frame)
   - Continuous reconnection attempts with 1s backoff
   - Some process trying to restart gateway every 10s
   - Gateway actually still running (pid 5150)

4. **No Daily Logs for 3 Days**
   - Last log: Feb 19, 11:11 PM
   - Daily logs are manual (created during sessions)
   - Suggests minimal/no human interaction Feb 20-22

5. **Elliot Spam Loop (Saturday morning)**
   - Exact cause unknown (Elliot offline, can't check logs)
   - Occurred during Discord connection instability
   - Required hard shutdown to stop

### Likely Causes

**For Elliot's spam loop:**
- **Hypothesis A**: Discord message confirmation failures during WebSocket instability
  - Message sent → no ACK received → retry → duplicate post
  - Infinite loop if error handling broken

- **Hypothesis B**: Automated recovery/monitoring script gone rogue
  - Script detecting Discord connection failures
  - Attempting to post status updates or error messages
  - Loop triggered by failures → more failures

- **Hypothesis C**: Heartbeat or cron task triggering Discord posts
  - Task expected to run once
  - Discord API errors causing retries
  - No rate limiting or max retry count

### Contributing Factors

1. **No monitoring/alerting for cron failures**
   - 3 nights of YouTube pipeline failures went undetected
   - Dream Cycle never running went unnoticed

2. **Duplicate message pattern precedent**
   - Feb 21 9am: "posting issue to Discord" response duplicated
   - Suggests existing bug in Discord message sending

3. **Missing error handling**
   - No max retry limits on Discord reconnections
   - No backoff ceiling (stuck at 1000ms)
   - No circuit breaker for repeated failures

4. **Cross-machine coordination gap**
   - Claudia: WebSocket failing, no messages sent
   - Elliot: apparently sending messages successfully (too successfully)
   - No shared state visibility

---

## Impact

- **Discord channel spammed** (exact message count unknown)
- **Elliot machine offline** (hard shutdown required)
- **3 nights of autonomous operations failed silently**
  - No YouTube intelligence gathered
  - No Dream Cycle pattern synthesis
  - No learning/memory updates
- **Trust in autonomous systems damaged**
- **Manual intervention required** (defeats automation purpose)

---

## Immediate Actions Taken

1. ✅ Elliot machine shut down remotely (stopped spam)
2. ✅ Claudia machine still running (Discord eventually reconnected)
3. ✅ Python `yaml` module now installed (unclear when/by whom)

---

## Additional Findings (Post-Initial Investigation)

### 1. Gateway Restart Loop — ROOT CAUSE FOUND
- **launchd plist** (`~/Library/LaunchAgents/ai.openclaw.gateway.plist`) has `KeepAlive: true`
- This tells macOS to restart the gateway whenever it dies
- But gateway was already running (pid 5150), causing failed restart every ~10 seconds
- **Feb 21: 16,992 failed restart attempts**
- **Feb 22: 6,527 failed restart attempts (before 9:15am recovery)**
- Something caused launchd to think the process needed restarting while it was still alive
- The error log was growing by ~60,000 lines/day from this alone

### 2. Delivery Recovery Mechanism
- At 9:15am Feb 22, when Claudia's Discord reconnected, 2 queued messages were recovered
- `[delivery-recovery] Recovered delivery ... to discord:channel:1473054526276763872`
- This shows OpenClaw has a message retry/recovery system
- **If Elliot's version of this had no limit on retries, it could cause the spam loop**

### 3. YouTube Pipeline Double-Logging (Fixed)
- `log()` function used `tee -a` (writes to file AND stdout)
- Crontab also redirected stdout to same file (`>> nightly.log 2>&1`)
- Result: every log line written twice
- **Fixed:** Changed `tee -a` to simple `>>` append

### 4. Hardcoded API Key in launchd Plist ⚠️
- Gemini API key hardcoded in `ai.openclaw.gateway.plist` EnvironmentVariables
- Gateway token also hardcoded there
- Should reference `.env` file instead

### 5. Daily Log Automation — IMPLEMENTED
- Created `scripts/daily-log-generator.sh`
- Cron job set: runs at 11:55pm daily via OpenClaw cron (Gemini Flash)
- Generates logs from gateway activity even when no human sessions occur
- Retroactively generated logs for Feb 20, 21, 22

## Required Investigations

1. **Check Elliot's logs** (when machine back online)
   - `~/.openclaw/logs/gateway.log` for Feb 21-22
   - Discord session logs
   - What messages were actually posted?
   - What triggered the loop?

2. **Check Discord message history**
   - #general channel around Saturday 6-10am
   - Which bot was posting (Claudia or Elliot)?
   - What was the repeated message?

3. **Find the gateway restart trigger**
   - What process was attempting `openclaw gateway start` every 10s?
   - Check for monitoring scripts, cron jobs, systemd services

4. **Audit all cron jobs** (both machines)
   - Expected: YouTube pipeline (1am), Dream Cycle (2:30am)
   - Actual: Only YouTube pipeline
   - Any unexpected jobs?

5. **Review Discord integration code**
   - Why duplicate responses on Feb 21 9am?
   - Why no retry limits on failed sends?
   - Why WebSocket reconnect has no backoff ceiling?

---

## Recommended Fixes

### Immediate (before re-enabling Elliot)

1. **Add Dream Cycle to crontab properly**
   ```bash
   30 2 * * * python3 ~/.openclaw/openclaw-pipeline/dream-cycle.py >> ~/.openclaw/dream-cycle.log 2>&1
   ```

2. **Fix YouTube pipeline duplicate execution**
   - Check `nightly-claudia.sh` for why it runs twice
   - Add flock/lockfile to prevent concurrent runs

3. **Add cron failure monitoring**
   - Send Discord notification if pipeline fails
   - Alert if Dream Cycle produces no output
   - Example: append to cron: `|| curl -X POST <discord-webhook> -d "Pipeline failed"`

4. **Add Discord retry limits**
   - Max 3 retries on send failure
   - Exponential backoff: 1s, 2s, 4s
   - After 3 failures: log error and abort (don't loop forever)

5. **Add circuit breaker for WebSocket reconnections**
   - If 10 consecutive failures: stop trying for 5 minutes
   - Alert admin via alternative channel (Telegram)

### Short-term (this week)

6. **Daily log automation**
   - End-of-day cron to summarize session activity
   - Even if no human sessions, create stub log
   - Easier to spot "missing days"

7. **Heartbeat health checks**
   - Cron jobs POST success/failure to monitoring endpoint
   - Dashboard showing last successful run of each task
   - Alert if any task hasn't succeeded in 24h

8. **Cross-machine visibility**
   - Shared status file (synced via rsync or central server)
   - Each bot can see other's health status
   - Avoid both spamming Discord with errors simultaneously

9. **Discord rate limiting**
   - Max N messages per minute per bot
   - If limit exceeded: queue or drop (don't retry infinitely)

### Long-term (next sprint)

10. **Structured logging and log aggregation**
    - All logs → central JSONL format
    - Searchable by timestamp, severity, component
    - Easier incident investigation

11. **Graceful degradation**
    - If Discord down: fall back to Telegram
    - If both down: write to local file + retry later
    - Never get stuck in infinite loop

12. **Pre-deployment testing**
    - Test cron jobs manually before adding to crontab
    - Verify dependencies (like `yaml` module) in setup script
    - Dry-run mode for testing without side effects

---

## Questions for David

1. **What was the repeated message Elliot posted?**
   - Text content?
   - Which Discord channel?
   - Approximately how many times?

2. **What time did you notice and shut down Elliot?**
   - Helps narrow timeline

3. **Did you make any changes to either machine Feb 20-22?**
   - Install Python packages?
   - Modify cron?
   - Restart services?

4. **Is Elliot still offline?**
   - When can we access logs for investigation?

---

## Lessons Learned

1. **"Set cron" ≠ actually set cron** - verify with `crontab -l`
2. **Silent failures are worse than loud ones** - always alert on errors
3. **Test dependencies in deployment** - don't assume `yaml` is installed
4. **Retry logic needs limits** - infinite retries = infinite loops
5. **Monitor the monitors** - even autonomous systems need health checks
6. **Daily logs are memory** - gaps = amnesia

---

**Next Steps:**
1. Wait for David's answers
2. Bring Elliot back online in safe mode (Discord disabled?)
3. Investigate logs together
4. Implement immediate fixes before re-enabling automation

---

## Resolution (2026-02-22 21:00 GMT)

### Confirmed Root Cause
Bot-to-bot feedback loop in Discord #family-matters channel. Both bots had `allowBots: true` with no ping-pong protection. GPT-4o-mini (default model) was too dumb to recognise or break the loop.

### Fixes Applied
1. ✅ Stuck sessions cleared on both machines
2. ✅ `session.agentToAgent.maxPingPongTurns: 2` added to both configs
3. ✅ Anti-loop rules added to Claudia's VITALS.md
4. ✅ Anti-loop rules pending for Elliot's AGENTS.md (David adding manually)
5. ✅ Default model changing from gpt-4o-mini → gemini-2.5-flash (smarter, free)
6. ✅ Automated daily logging implemented (never miss logs again)
7. ✅ YouTube pipeline double-logging bug fixed

### Key Lesson
**Model quality is a safety issue, not just a cost issue.** Cheap models that can't follow nuanced rules are dangerous in multi-agent setups. The spam loop would likely never have occurred with a smarter default model.

---

*Report created: 2026-02-22 16:50 GMT*  
*Updated: 2026-02-22 21:25 GMT*  
*Investigator: Claudia*  
*Status: RESOLVED — quick fixes applied, full model strategy pending*
