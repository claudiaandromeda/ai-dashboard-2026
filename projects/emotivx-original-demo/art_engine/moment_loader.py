#!/usr/bin/env python3
"""
Load real StatsBomb moment data and convert to art engine path format.
Supports single moments and multi-moment (hat trick) overlays.
"""

import json
import os
from pathlib import Path


LABEL_TO_EVENT = {
    "Pass": "pass",
    "Ball Receipt*": "pass",
    "Ball Receipt": "pass",
    "Carry": "pass",
    "Dribble": "pass",
    "Clearance": "pass",
    "Interception": "pass",
    "Shot": "shot",
    "Goal Keeper": "pass",
}


def load_match_file(match_id="3749246"):
    """Load a StatsBomb match moments file."""
    data_dir = Path(__file__).parent.parent / "data" / "moments" / "statsbomb"
    filepath = data_dir / f"{match_id}.json"
    if not filepath.exists():
        return []
    with open(filepath) as f:
        return json.load(f)


def list_moments(match_id="3749246"):
    """List available moments in a match."""
    moments = load_match_file(match_id)
    result = []
    for m in moments:
        result.append({
            "moment_id": m["moment_id"],
            "type": m["moment_type"],
            "title": m["title"],
            "data_lines": len(m.get("data_lines", [])),
        })
    return result


def moment_to_path(moment_data):
    """
    Convert a StatsBomb moment to art engine path format.
    Returns list of (x, y, event_type) tuples.
    """
    path = []
    data_lines = moment_data.get("data_lines", [])
    
    if not data_lines:
        return path
    
    last_line = data_lines[-1]
    is_goal = moment_data.get("moment_type") == "Goal"
    
    for i, dl in enumerate(data_lines):
        x = dl.get("X", 0.5)
        y = dl.get("Y", 0.5)
        label = dl.get("Label", "")
        
        # Determine event type
        if i == len(data_lines) - 1 and is_goal:
            evt = "goal"
        elif label == "Shot":
            evt = "shot"
        else:
            evt = LABEL_TO_EVENT.get(label, "pass")
        
        # Skip duplicate coordinates (carry from same spot)
        if path and abs(path[-1][0] - x) < 0.001 and abs(path[-1][1] - y) < 0.001:
            # Update event type if this one is more significant
            if evt == "goal" or (evt == "shot" and path[-1][2] == "pass"):
                path[-1] = (x, y, evt)
            continue
        
        path.append((x, y, evt))
    
    return path


def load_moment_path(match_id="3749246", moment_index=0):
    """Load a specific moment as an art engine path."""
    moments = load_match_file(match_id)
    if moment_index >= len(moments):
        return [], {}
    moment = moments[moment_index]
    path = moment_to_path(moment)
    meta = {
        "title": moment.get("title", ""),
        "type": moment.get("moment_type", ""),
        "venue": moment.get("venue", ""),
        "competition": moment.get("competition", ""),
        "match_id": match_id,
    }
    return path, meta


def load_multi_moment_paths(match_id="3749246", moment_indices=None):
    """
    Load multiple moments for overlay (e.g. hat trick).
    Returns list of (path, meta) tuples.
    """
    moments = load_match_file(match_id)
    if moment_indices is None:
        # Default: all goals
        moment_indices = [i for i, m in enumerate(moments) if m["moment_type"] == "Goal"]
    
    results = []
    for idx in moment_indices:
        if idx < len(moments):
            path = moment_to_path(moments[idx])
            meta = {
                "title": moments[idx].get("title", ""),
                "type": moments[idx].get("moment_type", ""),
            }
            results.append((path, meta))
    
    return results


if __name__ == "__main__":
    # Demo: list moments and show first goal path
    moments = list_moments()
    print(f"Match has {len(moments)} moments:")
    for m in moments:
        print(f"  [{m['type']:12s}] {m['title']} ({m['data_lines']} events)")
    
    print("\n--- First goal path ---")
    path, meta = load_moment_path(moment_index=0)
    print(f"Title: {meta['title']}")
    for x, y, evt in path:
        print(f"  ({x:.3f}, {y:.3f}) {evt}")
