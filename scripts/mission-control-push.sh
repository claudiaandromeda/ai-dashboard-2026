#!/bin/bash
# Mission Control auto-push v2 — richer activity + model routing
STATE_DIR="/Users/claudia/.openclaw/workspace/projects/mission-control"
STATE_FILE="$STATE_DIR/state.json"
ITERATIONS=${1:-20}

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

function runLocal(cmd) {
  try { return execSync(cmd, { timeout: 10000 }).toString().trim(); } catch(e) { return ''; }
}

function sshCheck(cmd) {
  try {
    return execSync('ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no elliot@192.168.0.85 \"' + cmd + '\"', { timeout: 8000 }).toString().trim();
  } catch(e) { return null; }
}

async function main() {
  const now = Date.now();
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const payload = {
    _ts: now,
    version: '2026.2.26',
    agents: [],
    crons: [],
    history: [],
    oauth: {
      monthly_gbp: 180,
      bots: 2,
      today_active_bots: 0,
      days_left_in_month: daysInMonth - today.getDate()
    },
    fleet: {},
    fleet_totals: { spend_today: 0, spend_week: 0, spend_month: 0 }
  };

  // === CLAUDIA (local) ===
  try {
    const raw = runLocal('/opt/homebrew/bin/openclaw status 2>/dev/null');
    const verMatch = raw.match(/npm latest (\\S+)/);
    if (verMatch) payload.version = verMatch[1];

    // Parse ALL sessions for activity detection
    const sessions = [];
    const lines = raw.split('\\n');
    let inSessions = false;
    for (const line of lines) {
      if (line.includes('Key') && line.includes('Kind') && line.includes('Model')) { inSessions = true; continue; }
      if (inSessions && line.includes('│')) {
        const parts = line.split('│').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 4) {
          sessions.push({ key: parts[0], kind: parts[1], age: parts[2], model: parts[3], tokens: parts[4] || '' });
        }
      }
    }

    // Find active discord session
    const discSession = sessions.find(s => s.key && s.key.includes('discord'));
    const webSession = sessions.find(s => s.key && s.key.includes('webui'));
    const activeModel = discSession?.model || 'unknown';

    // Detect current activity
    let activity = { state: 'idle', label: 'Idle', detail: '' };
    const subagents = sessions.filter(s => s.kind && s.kind.includes('sub'));
    const cronSessions = sessions.filter(s => s.kind && s.kind.includes('cron'));

    if (subagents.length > 0) {
      activity = { state: 'working', label: subagents.length + ' sub-agent' + (subagents.length>1?'s':'') + ' running', detail: subagents.map(s => s.key.split(':').pop()).join(', ') };
    } else if (cronSessions.length > 0) {
      activity = { state: 'working', label: 'Running cron job', detail: cronSessions[0].key };
    } else if (webSession && parseInt(webSession.age) < 60) {
      activity = { state: 'thinking', label: 'WebUI session active', detail: '' };
    } else if (discSession) {
      // Check if discord session age suggests recent activity
      const ageStr = discSession.age || '';
      activity = { state: 'idle', label: 'Monitoring Discord', detail: sessions.length + ' sessions' };
    }

    // Context window usage
    let context = { text: '—', pct: 0 };
    if (discSession?.tokens) {
      const ctxMatch = discSession.tokens.match(/(\\d+)k\\/(\\d+)k\\s*\\((\\d+)%\\)/);
      if (ctxMatch) context = { text: ctxMatch[1] + 'k / ' + ctxMatch[2] + 'k', pct: parseInt(ctxMatch[3]) };
    }

    // Channels
    const channels = [];
    if (/Discord.*ON.*OK/.test(raw)) channels.push({ name: 'Discord', connected: true });
    if (/Telegram.*ON.*OK/.test(raw)) channels.push({ name: 'Telegram', connected: true });

    // Node status
    let node = { paired: false, connected: false };
    try {
      const nodeResp = await fetch('/__openclaw__/api/nodes');
      if (nodeResp?.paired?.length) {
        node.paired = true;
        node.connected = nodeResp.paired.some(n => n.connected);
        node.name = nodeResp.paired[0]?.name || '';
      }
    } catch(e) {}

    // Fallback chain from config
    let fallbacks = [];
    try {
      const cfg = JSON.parse(fs.readFileSync('/Users/claudia/.openclaw/openclaw.json', 'utf8'));
      const m = cfg.agents?.defaults?.model || {};
      fallbacks = [m.primary, ...(m.fallbacks || [])].filter(Boolean);
    } catch(e) {}

    // Model routing map
    const modelRouting = {
      discord: activeModel,
      webui: activeModel,
      pipeline: 'ollama/mistral:7b',
      default: fallbacks[0] || activeModel
    };

    payload.fleet.claudia = {
      status: 'online',
      model: activeModel,
      modelRouting: modelRouting,
      activity: activity,
      context: context,
      spend_today: 0, spend_week: 0, spend_month: 0,
      budget_remaining: 20, budget_limit: 20,
      fallbacks: fallbacks,
      channels: channels,
      node: node,
      sessions: sessions.length
    };
    payload.oauth.today_active_bots++;

    // Sub-agents
    try {
      const resp = await fetch('/__openclaw__/api/sessions?limit=20');
      if (resp?.sessions) {
        const subs = resp.sessions.filter(s => s.key?.includes('subagent'));
        payload.agents = subs.slice(0, 10).map(s => ({
          name: s.label || s.key.split(':').pop().substring(0, 16),
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
      if (cronResp?.jobs) {
        payload.crons = cronResp.jobs.filter(j => j.enabled !== false).map(j => ({
          name: j.name || j.id.substring(0, 8),
          schedule: j.schedule.kind === 'cron' ? j.schedule.expr :
                    j.schedule.kind === 'every' ? 'Every ' + Math.round(j.schedule.everyMs/60000) + 'min' :
                    j.schedule.kind === 'at' ? 'One-shot' : 'unknown',
          enabled: j.enabled !== false,
          lastRunStatus: j.lastRunStatus || 'ok',
          lastRun: j.lastRunAt || null
        }));
      }
    } catch(e) {}

  } catch(e) { console.error('Claudia error:', e.message); }

  // === ELLIOT (SSH) ===
  const elliotGateway = sshCheck('ps aux | grep openclaw-gateway | grep -v grep | wc -l');
  const elliotOnline = elliotGateway && parseInt(elliotGateway) > 0;

  if (elliotOnline) {
    // Get model + fallbacks from config
    let elliotModel = 'unknown', elliotChain = [], elliotChannels = [];
    try {
      const cfgRaw = sshCheck('cat /home/elliot/.openclaw/openclaw.json');
      if (cfgRaw) {
        const ec = JSON.parse(cfgRaw);
        const em = ec.agents?.defaults?.model || {};
        elliotModel = em.primary || 'unknown';
        elliotChain = [em.primary, ...(em.fallbacks || [])].filter(Boolean);
        // Channels
        if (ec.channels?.discord?.enabled !== false) elliotChannels.push({ name: 'Discord', connected: true });
        if (ec.channels?.telegram?.enabled) elliotChannels.push({ name: 'Telegram', connected: true });
      }
    } catch(e) {}

    // Elliot activity — check sessions via SSH
    let elliotActivity = { state: 'idle', label: 'Monitoring Discord', detail: '' };
    const elliotStatus = sshCheck('/home/elliot/.npm-global/bin/openclaw status 2>/dev/null | head -30');
    if (elliotStatus) {
      const subCount = (elliotStatus.match(/subagent/g) || []).length;
      if (subCount > 0) {
        elliotActivity = { state: 'working', label: subCount + ' sub-agent' + (subCount>1?'s':''), detail: '' };
      }
      const sessMatch = elliotStatus.match(/(\\d+) active/);
      if (sessMatch) elliotActivity.detail = sessMatch[1] + ' sessions';
    }

    const elliotRouting = {
      discord: elliotModel,
      pipeline: 'ollama/mistral:7b',
      default: elliotModel
    };

    payload.fleet.elliot = {
      status: 'online',
      model: elliotModel,
      modelRouting: elliotRouting,
      activity: elliotActivity,
      context: { text: '—', pct: 0 },
      spend_today: 0, spend_week: 0, spend_month: 0,
      budget_remaining: 20, budget_limit: 20,
      fallbacks: elliotChain,
      channels: elliotChannels,
      node: { paired: false, connected: false },
      sessions: 0
    };
    payload.oauth.today_active_bots++;
  } else {
    payload.fleet.elliot = {
      status: sshCheck('echo ok') ? 'offline' : 'unreachable',
      model: '—', modelRouting: {}, activity: { state: 'offline', label: 'Offline', detail: '' },
      spend_today: 0, spend_week: 0, spend_month: 0,
      budget_remaining: 0, budget_limit: 0, fallbacks: [], channels: []
    };
  }

  // === CLIVE (VPS) ===
  payload.fleet.clive = {
    status: 'disabled', model: '—', modelRouting: {},
    activity: { state: 'disabled', label: 'Telegram disabled', detail: '' },
    spend_today: 0, spend_week: 0, spend_month: 0,
    budget_remaining: 0, budget_limit: 0, fallbacks: [], channels: []
  };

  fs.writeFileSync('$STATE_FILE', JSON.stringify(payload, null, 2));

  // Push to canvas if open
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

  console.log('OK — fleet: claudia=' + (payload.fleet.claudia?.status||'?') + ' elliot=' + (payload.fleet.elliot?.status||'?'));
}

main().catch(e => { console.error(e.message); process.exit(1); });
  " 2>/dev/null

  [ \$i -lt \$ITERATIONS ] && sleep 30
done
echo "[$(date +%H:%M:%S)] Done"
