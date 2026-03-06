#!/usr/bin/env python3
"""
Session Discovery Script
Runs on fresh session start to auto-load all available context
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


class SessionDiscovery:
    """Auto-discover and load available context on fresh session."""
    
    def __init__(self):
        self.workspace = Path("/Users/claudia/.openclaw/workspace/memory")
        self.today = datetime.now().strftime("%Y-%m-%d")
        self.context = {}
    
    def discover_recovery_doc(self) -> Optional[Path]:
        """Find latest recovery document."""
        try:
            recovery_files = list(self.workspace.glob("FULL_SESSION_RECOVERY_*.md"))
            if recovery_files:
                latest = sorted(recovery_files)[-1]
                return latest
        except Exception as e:
            print(f"Error discovering recovery doc: {e}")
        return None
    
    def discover_conversation_logs(self) -> Optional[Path]:
        """Find today's conversation log."""
        try:
            conv_dir = self.workspace / "conversation-logs"
            if conv_dir.exists():
                today_logs = list(conv_dir.glob(f"{self.today}_*.md"))
                if today_logs:
                    return today_logs[0]
        except Exception as e:
            print(f"Error discovering conversation logs: {e}")
        return None
    
    def discover_reasoning_logs(self) -> List[Path]:
        """Find today's reasoning blocks."""
        try:
            reason_dir = self.workspace / "reasoning-logs"
            if reason_dir.exists():
                today_reasoning = list(reason_dir.glob(f"{self.today}_*.md"))
                return sorted(today_reasoning, reverse=True)
        except Exception as e:
            print(f"Error discovering reasoning logs: {e}")
        return []
    
    def discover_daily_log(self) -> Optional[Path]:
        """Find today's daily log."""
        try:
            daily_log = self.workspace / "daily" / f"{self.today}.md"
            if daily_log.exists():
                return daily_log
        except Exception as e:
            print(f"Error discovering daily log: {e}")
        return None
    
    def get_last_conversation_message(self, conv_log: Path) -> Optional[str]:
        """Extract last message from conversation log."""
        try:
            content = conv_log.read_text()
            lines = content.strip().split("\n")
            # Find last message line (starts with [HH:MM:SS])
            for line in reversed(lines):
                if line.strip().startswith("[") and "]" in line:
                    return line[:100]  # First 100 chars
            return None
        except Exception:
            return None
    
    def get_last_reasoning_block(self, reasoning_logs: List[Path]) -> Optional[str]:
        """Extract summary of last reasoning block."""
        try:
            if reasoning_logs:
                latest = reasoning_logs[0]
                content = latest.read_text()
                # Extract topic from filename
                topic = latest.stem.split("_")[-1]
                return f"{topic} (from {latest.name})"
            return None
        except Exception:
            return None
    
    def get_session_status(self) -> Dict:
        """Get full session discovery status."""
        recovery_doc = self.discover_recovery_doc()
        conv_log = self.discover_conversation_logs()
        reasoning_logs = self.discover_reasoning_logs()
        daily_log = self.discover_daily_log()
        
        last_msg = self.get_last_conversation_message(conv_log) if conv_log else None
        last_thinking = self.get_last_reasoning_block(reasoning_logs) if reasoning_logs else None
        
        return {
            "timestamp": datetime.now().isoformat(),
            "recovery_document": str(recovery_doc) if recovery_doc else None,
            "conversation_log": str(conv_log) if conv_log else None,
            "reasoning_logs_count": len(reasoning_logs),
            "reasoning_logs_latest": str(reasoning_logs[0]) if reasoning_logs else None,
            "daily_log": str(daily_log) if daily_log else None,
            "last_conversation_message": last_msg,
            "last_reasoning_topic": last_thinking,
            "resources_available": {
                "recovery_document": recovery_doc is not None,
                "conversation_log": conv_log is not None,
                "reasoning_logs": len(reasoning_logs) > 0,
                "daily_log": daily_log is not None,
            }
        }
    
    def print_startup_report(self):
        """Print human-readable startup report."""
        status = self.get_session_status()
        
        print("\n" + "="*70)
        print("SESSION DISCOVERY REPORT")
        print("="*70)
        print(f"Time: {status['timestamp']}")
        print(f"Date: {self.today}")
        print()
        
        print("📦 RESOURCES AVAILABLE:")
        if status['recovery_document']:
            print(f"  ✅ Recovery document: {Path(status['recovery_document']).name}")
        else:
            print(f"  ❌ No recovery document")
        
        if status['conversation_log']:
            print(f"  ✅ Conversation log: {Path(status['conversation_log']).name}")
            if status['last_conversation_message']:
                print(f"     Last message: {status['last_conversation_message']}")
        else:
            print(f"  ❌ No conversation log")
        
        if status['reasoning_logs_count'] > 0:
            print(f"  ✅ Reasoning blocks: {status['reasoning_logs_count']} found")
            if status['last_reasoning_topic']:
                print(f"     Latest: {status['last_reasoning_topic']}")
        else:
            print(f"  ❌ No reasoning blocks yet")
        
        if status['daily_log']:
            print(f"  ✅ Daily log: {Path(status['daily_log']).name}")
        else:
            print(f"  ❌ No daily log")
        
        print()
        print("📋 QUICK START:")
        if status['recovery_document']:
            print(f"   1. Read: {Path(status['recovery_document']).name}")
            print(f"   2. Check: Last conversation message")
            print(f"   3. Search: reasoning-logs/ for decision trees")
            print(f"   4. Continue: Where you left off")
        else:
            print("   Fresh start session (no previous context)")
        
        print()
        print("🔍 SEARCH COMMANDS:")
        if status['conversation_log']:
            conv_name = Path(status['conversation_log']).name
            print(f"   grep 'keyword' {conv_name}")
        print(f"   grep -r '#topic' reasoning-logs/{self.today}_*.md")
        
        print()
        print("="*70 + "\n")
        
        return status
    
    def save_startup_report(self) -> Path:
        """Save startup report to file."""
        status = self.get_session_status()
        
        report_file = self.workspace / f"SESSION_STARTUP_{self.today}_latest.txt"
        
        report = f"""SESSION STARTUP REPORT
Generated: {status['timestamp']}
Date: {self.today}

RESOURCES AVAILABLE
==================
Recovery document: {status['recovery_document']}
Conversation log: {status['conversation_log']}
Reasoning logs: {status['reasoning_logs_count']} blocks
Daily log: {status['daily_log']}

LAST ACTIVITY
=============
Conversation: {status['last_conversation_message']}
Reasoning: {status['last_reasoning_topic']}

INSTRUCTIONS
============
1. Read SESSION_START_STRATEGY.md for detailed startup protocol
2. If recovery_document exists, read it first
3. Load conversation_log and reasoning_logs
4. Use grep to search for topics/decisions
5. Continue work from last saved point

Files location: /Users/claudia/.openclaw/workspace/memory/
"""
        
        report_file.write_text(report)
        return report_file


def main():
    """Run session discovery."""
    discovery = SessionDiscovery()
    status = discovery.print_startup_report()
    discovery.save_startup_report()
    
    # Exit code 0 if resources found, 1 if fresh session
    has_resources = any(status['resources_available'].values())
    return 0 if has_resources else 0  # Return 0 always (not an error)


if __name__ == "__main__":
    main()
