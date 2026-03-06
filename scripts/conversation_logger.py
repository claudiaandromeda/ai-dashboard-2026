#!/usr/bin/env python3
"""
Bulletproof Conversation Logger
Layers: Ollama (primary) + Python fallback + Git backup + Health checks + Dashboard
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Optional


class ConversationLogger:
    """Core logger — used by both Ollama and fallback Python."""
    
    def __init__(self, log_dir: Optional[str] = None):
        self.log_dir = Path(log_dir or "/Users/claudia/.openclaw/workspace/memory/conversation-logs")
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = None
        self.index_file = Path("/Users/claudia/.openclaw/workspace/memory/CONVERSATION_INDEX.md")
        self._setup_log_file()
    
    def _setup_log_file(self):
        """Create or open today's log file."""
        today = datetime.now().strftime("%Y-%m-%d")
        self.log_file = self.log_dir / f"{today}_emotivx-rebuild.md"
        
        if not self.log_file.exists():
            # Create new log file with header
            header = f"# Conversation Log — {today}\n\n**Channel:** WebUI + Telegram + Discord  \n**Status:** ACTIVE\n\n---\n\n"
            self.log_file.write_text(header)
    
    def log_message(
        self,
        speaker: str,
        message: str,
        tags: Optional[List[str]] = None,
        timestamp: Optional[str] = None
    ) -> bool:
        """Log a single message with timestamp and tags.
        
        Args:
            speaker: "CLAUDIA" or "CLAUDE" or "DISCORD:username" or "TELEGRAM:name"
            message: The message text
            tags: Optional list of topic tags (e.g., ["logging", "emotivx"])
            timestamp: Optional custom timestamp; defaults to now
        
        Returns:
            True if successful, False if failed
        """
        try:
            if timestamp is None:
                timestamp = datetime.now().strftime("%H:%M:%S")
            
            tags_str = " ".join([f"#{tag}" for tag in (tags or [])])
            
            entry = f"[{timestamp}] {speaker}: {message}"
            if tags_str:
                entry += f" {tags_str}"
            entry += "\n\n"
            
            # Append to file
            with open(self.log_file, "a") as f:
                f.write(entry)
            
            # Update index
            self._update_index(speaker, tags or [])
            
            return True
        
        except Exception as e:
            print(f"ERROR logging message: {e}", file=sys.stderr)
            return False
    
    def _update_index(self, speaker: str, tags: List[str]):
        """Update CONVERSATION_INDEX.md with session stats."""
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            time_now = datetime.now().strftime("%H:%M")
            
            # Count messages in today's log
            if self.log_file.exists():
                content = self.log_file.read_text()
                msg_count = content.count("\n[")
            else:
                msg_count = 0
            
            # Build or update index entry
            index_entry = f"| {today} | {time_now}–... | emotivx-rebuild | {', '.join(set(tags))} | ACTIVE |\n"
            
            if not self.index_file.exists():
                header = """# Conversation Index

| Date | Time | Session | Topics | Status |
|------|------|---------|--------|--------|
"""
                self.index_file.write_text(header + index_entry)
            else:
                # Check if today's entry exists; update if needed
                index_content = self.index_file.read_text()
                if today not in index_content:
                    with open(self.index_file, "a") as f:
                        f.write(index_entry)
        
        except Exception as e:
            print(f"Warning: Failed to update index: {e}", file=sys.stderr)
    
    def get_last_update(self) -> float:
        """Return Unix timestamp of last log file modification."""
        try:
            return self.log_file.stat().st_mtime if self.log_file.exists() else 0
        except Exception:
            return 0
    
    def get_message_count(self) -> int:
        """Return number of messages logged today."""
        try:
            if self.log_file.exists():
                return self.log_file.read_text().count("[")
            return 0
        except Exception:
            return 0
    
    def get_age_minutes(self) -> float:
        """Return age of last log update in minutes."""
        last_mod = self.get_last_update()
        now = datetime.now().timestamp()
        return (now - last_mod) / 60


def fallback_log(message: str, speaker: str = "CLAUDE", tags: Optional[List[str]] = None) -> bool:
    """Direct file write if Ollama fails (Layer 2 fallback)."""
    try:
        logger = ConversationLogger()
        return logger.log_message(speaker, message, tags)
    except Exception as e:
        print(f"CRITICAL: Fallback logging failed: {e}", file=sys.stderr)
        return False


def check_logging_health() -> dict:
    """Check health of logging system (Layer 4)."""
    try:
        logger = ConversationLogger()
        age_minutes = logger.get_age_minutes()
        msg_count = logger.get_message_count()
        
        if age_minutes < 5:
            status = "healthy"
        elif age_minutes < 10:
            status = "stale"
        else:
            status = "failed"
        
        return {
            "status": status,
            "age_minutes": age_minutes,
            "message_count": msg_count,
            "log_file": str(logger.log_file),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


# CLI Usage
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 conversation_logger.py <message> [speaker] [tags...]")
        sys.exit(1)
    
    message = sys.argv[1]
    speaker = sys.argv[2] if len(sys.argv) > 2 else "CLAUDE"
    tags = sys.argv[3:] if len(sys.argv) > 3 else []
    
    success = fallback_log(message, speaker, tags)
    sys.exit(0 if success else 1)
