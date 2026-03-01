#!/bin/bash
# Mission Control auto-push — runs continuously, pushes every 30 seconds
# Collects data from Claudia (local) + Elliot (SSH) + writes state.json

STATE_DIR="/Users/claudia/.openclaw/workspace/projects/mission-control"
STATE_FILE="$STATE_DIR/state.json"
ITERATIONS=${1:-20}  # default 10 minutes (20 x 30s)

for i in $(seq 1 $ITERATIONS); do
  echo "[$(date +%H:%M:%S)] Push $i/$ITERATIONS"

  node -e "
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');

function fetch(path) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:18789' + path, { method: 'GET', timeout: 5000 }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function sshCheck(cmd) {
  try {
    return execSync('ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no elliot@192.168.0.85 \"' + cmd + '\"', { timeout: 8000 }).toString().trim();
  } catch(e) { return null; }
}

async function main() {
  const now = Date.now();
  const payload = {
    _ts: now,
    version: '2026.2.26',
    botState: 'idle',
    stateLabel: 'Ready',
    stateDetail: '',
    model: 'unknown',
    detail: '',
    thinking: 'off',
    context: { text: '—', pct: 0 },
    compactions: 0,
    cost: '—',
    todayCost: '—',
    agents: [],
    crons: [],
    fallbacks: [],
    channels: [],
    usage: {},
    usage_by_model: {},
    history: [],
    oauth: {
      monthly_gbp: 180,
      bots: 2,
      today_active_bots: 0,
      days_left_in_month: 0
    },
    fleet: {},
    fleet_totals: { spend_today: 0, spend_week: 0, spend_month: 0 }
  };

  // Days left in month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  payload.oauth.days_left_in_month = daysInMonth - today.getDate();

  // === CLAUDIA (local) ===
  try {
    const status = await fetch('/__openclaw__/api/status');
    if (status) {
      payload.model = status.model || 'unknown';
      payload.version = status.version || payload.version;
      if (status.context) {
        payload.context = {
          text: (status.context.used || 0).toLocaleString() + ' / ' + (status.context.max || 200000).toLocaleString(),
          pct: Math.round(((status.context.used || 0) / (status.context.max || 200000)) * 100)
        };
      }
      if (status.thinking) payload.thinking = status.thinking;
      if (status.compactions) payload.compactions = status.compactions;
    }
  } catch(e) {}

  // Claudia fleet entry
  payload.fleet.claudia = {
    status: 'online',
    model: payload.model,
    spend_today: 0,
    spend_week: 0,
    spend_month: 0,
    budget_remaining: 0,
    budget_limit: 0
  };
  payload.oauth.today_active_bots++;

  // Claudia sessions/subagents
  try {
    const resp = await fetch('/__openclaw__/api/sessions?limit=20');
    if (resp && resp.sessions) {
      const subs = resp.sessions.filter(s => s.key && s.key.includes('subagent'));
      payload.agents = subs.slice(0, 10).map(s => ({
        name: s.label || s.key.split(':').pop().substring(0, 12),
        model: s.model || '',
        done: !s.active,
        duration: s.runtime ? Math.round(s.runtime / 1000) + 's' : '',
        snippet: ''
      }));
    }
  } catch(e) {}

  // Crons
  try {
    const cronResp = await fetch('/__openclaw__/api/cron');
    if (cronResp && cronResp.jobs) {
      payload.crons = cronResp.jobs.filter(j => j.enabled !== false).map(j => ({
        name: j.name || j.id.substring(0, 8),
        schedule: j.schedule.kind === 'cron' ? j.schedule.expr :
                  j.schedule.kind === 'every' ? 'Every ' + Math.round(j.schedule.everyMs/60000) + 'min' :
                  j.schedule.kind === 'at' ? 'One-shot' : 'unknown',
        enabled: j.enabled !== false
      }));
    }
  } catch(e) {}

  // Fallback chain from config
  try {
    const cfg = await fetch('/__openclaw__/api/config');
    if (cfg) {
      const m = cfg.agents?.defaults?.model || {};
      const chain = [m.primary, ...(m.fallbacks || [])].filter(Boolean);
      payload.fallbacks = chain.length ? chain : [payload.model];

      // Channels
      const chs = [];
      if (cfg.channels?.discord) chs.push({ name: 'Discord', connected: true, status: 'Guild ' + (cfg.channels.discord.guildId || '') });
      if (cfg.channels?.telegram) chs.push({ name: 'Telegram', connected: true, status: 'DM' });
      payload.channels = chs;
    }
  } catch(e) {}

  // === ELLIOT (SSH) ===
  const elliotGateway = sshCheck('ps aux | grep openclaw-gateway | grep -v grep | wc -l');
  const elliotOnline = elliotGateway && parseInt(elliotGateway) > 0;

  if (elliotOnline) {
    const elliotModel = sshCheck(\"python3 -c \\\"import json; c=json.load(open('/home/elliot/.openclaw/openclaw.json')); print(c.get('agents',{}).get('defaults',{}).get('model',{}).get('primary','unknown'))\\\"\");
    payload.fleet.elliot = {
      status: 'online',
      model: elliotModel || 'unknown',
      spend_today: 0, spend_week: 0, spend_month: 0,
      budget_remaining: 0, budget_limit: 0
    };
    payload.oauth.today_active_bots++;
  } else {
    payload.fleet.elliot = {
      status: sshCheck('echo ok') ? 'offline' : 'unknown',
      model: '—',
      spend_today: 0, spend_week: 0, spend_month: 0,
      budget_remaining: 0, budget_limit: 0
    };
  }

  // === CLIVE (VPS — lightweight check) ===
  payload.fleet.clive = { status: 'disabled', model: '—', spend_today: 0, spend_week: 0, spend_month: 0, budget_remaining: 0, budget_limit: 0 };

  // Write state.json for dashboard polling
  fs.writeFileSync('$STATE_FILE', JSON.stringify(payload, null, 2));

  // Also push to canvas if open
  try {
    const pushData = JSON.stringify({ javaScript: 'window.update(' + JSON.stringify(payload) + ')' });
    const req = http.request('http://127.0.0.1:18789/__openclaw__/canvas/eval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(pushData) }
    });
    req.on('error', () => {});
    req.write(pushData);
    req.end();
  } catch(e) {}

  console.log('OK — fleet: claudia=' + payload.fleet.claudia.status + ' elliot=' + payload.fleet.elliot.status);
}

main().catch(e => { console.error(e.message); process.exit(1); });
  " 2>/dev/null

  if [ $i -lt $ITERATIONS ]; then
    sleep 30
  fi
done

echo "[$(date +%H:%M:%S)] Done"
