#!/usr/bin/env python3
"""
8am Fleet Morning Briefing
Posts daily model usage summary + rate limit status to Discord #family-matters
"""
import json, os, subprocess, datetime, pathlib

WORKSPACE = pathlib.Path('/Users/claudia/.openclaw/workspace')
STATE_FILE = WORKSPACE / 'projects/mission-control/state.json'

# Known rate limits for colour coding
RATE_LIMITS = {
    'claude-haiku-4-5':  {'rpd': None,  'rpd_warn': None},
    'gemini-2.5-flash':  {'rpd': 500,   'rpd_warn': 400},
    'gemini-3.1-pro':    {'rpd': 50,    'rpd_warn': 40},
    'mistral-7b':        {'rpd': None,  'rpd_warn': None},
}

def load_state():
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {}

def fmt_model(name):
    short = {'anthropic/claude-haiku-4-5': 'Haiku 4.5', 'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
             'google/gemini-3.1-pro-preview': 'Gemini 3.1 Pro', 'ollama/mistral:7b': 'Mistral 7B (local)'}
    return short.get(name, name.split('/')[-1])

def build_message(state):
    today = datetime.date.today().strftime('%a %d %b')
    lines = [f'**🦞 Fleet Morning Briefing — {today}**', '']

    fleet = state.get('fleet', {})
    for bot_id, bot_name in [('claudia', 'Claudia'), ('elliot', 'Elliot'), ('clive', 'Clive')]:
        b = fleet.get(bot_id, {})
        status = b.get('status', 'unknown')
        icon = '🟢' if status == 'online' else ('🔴' if status == 'offline' else '🟡')
        model = fmt_model(b.get('model', '?'))
        lines.append(f'{icon} **{bot_name}** — {model}')
        if status != 'online':
            lines.append(f'  ⚠️ Status: {status}')

    lines.append('')

    # Usage summary
    usage = state.get('usage_by_model', {})
    if usage:
        lines.append('**📊 Model Usage (last 24h)**')
        for mid, u in usage.items():
            reqs = u.get('rpd_current', 0)
            limit = RATE_LIMITS.get(mid, {}).get('rpd')
            warn = RATE_LIMITS.get(mid, {}).get('rpd_warn')
            if limit:
                pct = reqs / limit * 100
                bar = '🟥' if pct > 85 else ('🟨' if pct > 60 else '🟩')
                lines.append(f'  {bar} {mid}: {reqs}/{limit} req/day ({pct:.0f}%)')
            elif reqs:
                lines.append(f'  🟩 {mid}: {reqs} requests')

    lines.append('')

    # OAuth cost
    monthly = 180
    days_in_month = 31
    day_of_month = datetime.date.today().day
    days_left = days_in_month - day_of_month
    spent_so_far = (day_of_month / days_in_month * monthly)
    lines.append(f'**💷 OAuth Cost** — £{monthly}/mo Anthropic Max')
    lines.append(f'  Allocated so far: £{spent_so_far:.2f} | {days_left} days remaining')
    lines.append(f'  Marginal per token: £0.00 ✓')

    lines.append('')

    # Any alerts
    alerts = state.get('alerts', [])
    if alerts:
        lines.append('**⚠️ Alerts**')
        for a in alerts:
            lines.append(f'  • {a}')
        lines.append('')

    lines.append('*Dashboard: <http://localhost:18789>*')
    return '\n'.join(lines)

if __name__ == '__main__':
    state = load_state()
    msg = build_message(state)
    print(msg)  # stdout captured by OpenClaw cron delivery
