#!/usr/bin/env python3
"""Analyse Wrexham 360 match data — proper flat-key format."""
import json
from collections import Counter, defaultdict

files = {
    '1376994': 'Wrexham vs Coventry City (2025-10-31)',
    '1377235': 'Wrexham vs Sheffield United (2025-12-26)',
    '1377475': 'Wrexham vs Ipswich Town (2026-02-21)',
}

def load_match(match_id):
    with open(f'data/statsbomb/events/{match_id}.json') as f:
        raw = json.load(f)
    events = raw.get('events', [])
    lineups = raw.get('lineups', [])
    mi = raw.get('match', {})
    match_info = mi[0] if isinstance(mi, list) and mi else (mi if isinstance(mi, dict) else {})
    player_stats = raw.get('player_stats', [])
    team_stats = raw.get('team_stats', [])
    events.sort(key=lambda e: (e.get('minute', 0), e.get('second', 0), e.get('index', 0)))
    
    # Build player lookup from lineups
    players = {}
    for lu in lineups:
        players[lu['player_id']] = {
            'name': lu.get('player_nickname') or lu.get('player_name', '?'),
            'team': lu.get('team_name', '?'),
            'team_id': lu.get('team_id'),
            'jersey': lu.get('lineup_jersey'),
            'starter': lu.get('player_lineup_selection_type') == 'starting_xi',
        }
    
    # Build team lookup
    teams = {}
    for lu in lineups:
        tid = lu.get('team_id')
        if tid and tid not in teams:
            teams[tid] = lu.get('team_name', '?')
    
    return events, lineups, match_info, players, teams, player_stats, team_stats

report = ['# Wrexham 360 Match Data Analysis\n']
report.append('*Generated: 2026-03-07 23:40 GMT*\n')
report.append('## Quick Summary\n')
report.append('Three Wrexham 360 matches with full StatsBomb 360 event-level data.')
report.append('Format: flat keys (`name`, `team_id`, `player_id`, `start_x/y/z`, `end_x/y/z`, `xg`, `freeze_frame`).')
report.append('All three have 3D coordinate data (start_z, end_z on shots) and freeze frames on shots.\n')

all_match_summaries = []

for match_id, label in files.items():
    events, lineups, match_info, players, teams, player_stats, team_stats = load_match(match_id)
    
    def pname(pid):
        p = players.get(pid)
        return p['name'] if p else f'Player#{pid}'
    
    def tname(tid):
        return teams.get(tid, f'Team#{tid}')
    
    report.append(f'\n---\n\n## {label} (Match ID: {match_id})\n')
    report.append(f'**Total events:** {len(events)}')
    report.append(f'**Teams:** {" vs ".join(teams.values())}')
    
    # Match info
    if match_info:
        report.append(f'**Competition:** {match_info.get("competition_name", "?")} — {match_info.get("season_name", "?")}')
        report.append(f'**Stadium:** {match_info.get("stadium_name", "?")}')
        report.append(f'**Referee:** {match_info.get("referee_name", "?")}')
    
    # Event types
    type_counts = Counter(e.get('name', 'unknown') for e in events)
    report.append(f'\n### Event Type Distribution\n')
    for t, c in type_counts.most_common(20):
        report.append(f'- {t}: {c}')
    
    # Goals
    goals = [e for e in events if e.get('name') == 'shot' and e.get('outcome') == 'goal']
    own_goals = [e for e in events if e.get('name') == 'own-goal-for']
    
    report.append(f'\n### Goals ({len(goals)} shots scored + {len(own_goals)} own goals)\n')
    
    match_goals_detail = []
    for i, g in enumerate(goals):
        player = pname(g.get('player_id'))
        team = tname(g.get('team_id'))
        minute = g.get('minute', '?')
        xg = g.get('xg')
        xg_str = f'{xg:.3f}' if isinstance(xg, (int, float)) else 'N/A'
        shot_type = g.get('type', '?')
        body_part = g.get('body_part', '?')
        technique = g.get('technique', '?')
        start = f"({g.get('start_x', '?')}, {g.get('start_y', '?')}, {g.get('start_z', '?')})"
        end = f"({g.get('end_x', '?')}, {g.get('end_y', '?')}, {g.get('end_z', '?')})"
        has_ff = 'Yes' if g.get('freeze_frame') else 'No'
        ff_count = len(g.get('freeze_frame', []))
        penalty = g.get('penalty', False)
        dist = g.get('distance_to_opponents_goal')
        dist_str = f'{dist:.1f}m' if isinstance(dist, (int, float)) else '?'
        
        report.append(f'**Goal {i+1}: {player} ({team}) — {minute}\'**')
        report.append(f'  - xG: {xg_str} | Type: {shot_type} | Body: {body_part} | Technique: {technique}')
        report.append(f'  - Penalty: {"Yes" if penalty else "No"} | Distance to goal: {dist_str}')
        report.append(f'  - From: {start} → To: {end}')
        report.append(f'  - Freeze frame: {has_ff} ({ff_count} players captured)')
        
        # Find assist (key_pass event)
        if g.get('assist'):
            report.append(f'  - Assisted: Yes')
        
        # Find buildup — events from same team in 2-min window before goal
        goal_min = g.get('minute', 0)
        goal_sec = g.get('second', 0)
        goal_team = g.get('team_id')
        buildup = [e for e in events 
                    if e.get('team_id') == goal_team 
                    and e.get('minute', 0) >= goal_min - 2 
                    and (e.get('minute', 0) < goal_min or 
                         (e.get('minute', 0) == goal_min and e.get('second', 0) <= goal_sec))
                    and e.get('name') in ('pass', 'carry', 'shot', 'dribble')]
        
        if buildup:
            report.append(f'  - **Buildup ({len(buildup)} events):**')
            for b in buildup[-8:]:  # last 8 events
                bp = pname(b.get('player_id'))
                bn = b.get('name', '?')
                bm = b.get('minute', '?')
                bs = b.get('second', 0)
                report.append(f'    - {bm}:{bs:02d} {bp} → {bn} ({b.get("outcome", "complete")})')
        
        match_goals_detail.append({'player': player, 'team': team, 'minute': minute, 'xg': xg_str})
        report.append('')
    
    for og in own_goals:
        player = pname(og.get('player_id'))
        team = tname(og.get('team_id'))
        minute = og.get('minute', '?')
        report.append(f'**Own Goal: {player} ({team}) — {minute}\'**\n')
    
    # All shots
    all_shots = [e for e in events if e.get('name') == 'shot']
    report.append(f'### All Shots ({len(all_shots)} total)\n')
    for s in all_shots:
        player = pname(s.get('player_id'))
        team = tname(s.get('team_id'))
        minute = s.get('minute', '?')
        outcome = s.get('outcome', '?')
        xg = s.get('xg')
        xg_str = f'{xg:.3f}' if isinstance(xg, (int, float)) else 'N/A'
        report.append(f'- {minute}\': {player} ({team}) — {outcome} (xG: {xg_str})')
    report.append('')
    
    # Key players
    report.append('### Key Players\n')
    player_actions = defaultdict(lambda: defaultdict(int))
    for e in events:
        pid = e.get('player_id')
        n = e.get('name', '')
        if pid and n:
            player_actions[pid][n] += 1
            player_actions[pid]['_total'] += 1
    
    for tid, tn in sorted(teams.items(), key=lambda x: x[1]):
        report.append(f'**{tn}:**')
        team_pids = [pid for pid, p in players.items() if p['team_id'] == tid]
        top = sorted(team_pids, key=lambda pid: player_actions[pid]['_total'], reverse=True)[:7]
        for pid in top:
            a = player_actions[pid]
            p = players.get(pid, {})
            jersey = p.get('jersey', '?')
            starter = '⭐' if p.get('starter') else '🔄'
            report.append(f'  - {starter} #{jersey} {pname(pid)}: {a["_total"]} actions '
                         f'(passes:{a.get("pass",0)}, carries:{a.get("carry",0)}, '
                         f'shots:{a.get("shot",0)}, tackles:{a.get("tackle",0)}, '
                         f'recoveries:{a.get("ball-recovery",0)})')
        report.append('')
    
    # Passing
    report.append('### Possession & Passing\n')
    for tid, tn in sorted(teams.items(), key=lambda x: x[1]):
        team_passes = [e for e in events if e.get('name') == 'pass' and e.get('team_id') == tid]
        complete = sum(1 for p in team_passes if p.get('outcome') in (None, 'complete', 'success'))
        incomplete = sum(1 for p in team_passes if p.get('outcome') in ('incomplete', 'out'))
        total = len(team_passes)
        pct = f'{complete/total*100:.1f}%' if total > 0 else 'N/A'
        report.append(f'- **{tn}**: {complete}/{total} passes completed ({pct})')
    
    # Cards
    cards = [e for e in events if e.get('card')]
    if cards:
        report.append('\n### Cards\n')
        for c in cards:
            card = c.get('card', '?')
            player = pname(c.get('player_id'))
            minute = c.get('minute', '?')
            report.append(f"- {card}: {player} ({minute}')")
    
    # Subs
    subs = [e for e in events if e.get('name') == 'substitution']
    if subs:
        report.append('\n### Substitutions\n')
        for s in subs:
            player_off = pname(s.get('player_id'))
            player_on = pname(s.get('replacement_id')) if s.get('replacement_id') else '?'
            minute = s.get('minute', '?')
            team = tname(s.get('team_id'))
            report.append(f"- {minute}': {player_off} → {player_on} ({team})")
    
    # Data quality
    report.append('\n### Data Quality\n')
    has_locations = sum(1 for e in events if e.get('start_x') is not None)
    has_3d = sum(1 for e in events if e.get('start_z') is not None)
    shots_with_ff = sum(1 for s in all_shots if s.get('freeze_frame'))
    avg_ff_players = 0
    ff_shots = [s for s in all_shots if s.get('freeze_frame')]
    if ff_shots:
        avg_ff_players = sum(len(s['freeze_frame']) for s in ff_shots) / len(ff_shots)
    
    report.append(f'- Total events: {len(events)}')
    report.append(f'- Events with XY location: {has_locations} ({has_locations/len(events)*100:.1f}%)')
    report.append(f'- Events with 3D (Z) data: {has_3d}')
    report.append(f'- Shots: {len(all_shots)} total, {shots_with_ff} with freeze frames')
    report.append(f'- Avg players per freeze frame: {avg_ff_players:.1f}')
    report.append(f'- Unique players in lineups: {len([p for p in players.values() if p["team_id"] in teams])}')
    
    starters = [p for p in players.values() if p.get('starter') and p['team_id'] in teams]
    report.append(f'- Starting XI captured: {len(starters)} players')
    
    all_match_summaries.append({
        'label': label.split('(')[0].strip(),
        'events': len(events),
        'goals': len(goals),
        'own_goals': len(own_goals),
        'shots': len(all_shots),
        'ff': shots_with_ff,
        'has_3d': has_3d > 0,
        'location_pct': f'{has_locations/len(events)*100:.0f}%',
    })

# Art generation compatibility table
report.append('\n---\n\n## Art Generation Compatibility\n')
report.append('| Match | Events | Goals | OG | Shots | Freeze Frames | 3D Data | Locations |')
report.append('|-------|--------|-------|----|-------|---------------|---------|-----------|')
for s in all_match_summaries:
    report.append(f'| {s["label"]} | {s["events"]} | {s["goals"]} | {s["own_goals"]} | '
                  f'{s["shots"]} | {s["ff"]}/{s["shots"]} | {"✅" if s["has_3d"] else "❌"} | {s["location_pct"]} |')

report.append('\n## Key Findings for EmotivX\n')
report.append('1. **All three matches have rich 360 data** — XY coordinates on most events, 3D on shots')
report.append('2. **Freeze frames on shots** — player positions at moment of shot for potential future use')
report.append('3. **Full lineups with jersey numbers** — can map any player to their shirt number for merch')
report.append('4. **xG values on all shots** — can filter to highest-drama moments')
report.append('5. **Buildup sequences extractable** — pass/carry chains leading to goals give the art its story')
report.append('6. **3D shot data (start_z, end_z)** — height of ball at shot/arrival, unused currently but available')

output = '\n'.join(report)
with open('data/wrexham-360-analysis.md', 'w') as f:
    f.write(output)
print(f'Done — {len(output)} chars written to data/wrexham-360-analysis.md')
