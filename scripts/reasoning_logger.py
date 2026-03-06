#!/usr/bin/env python3
"""
Reasoning Logger
Captures thinking blocks, decision trees, analysis paths before responses
Called BEFORE each Claude response
"""

import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, List


class ReasoningLogger:
    """Log reasoning blocks and thinking processes."""
    
    def __init__(self, log_dir: Optional[str] = None):
        self.log_dir = Path(log_dir or "/Users/claudia/.openclaw/workspace/memory/reasoning-logs")
        self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def log_reasoning(
        self,
        thinking: str,
        topic: str = "analysis",
        tags: Optional[List[str]] = None,
        timestamp: Optional[str] = None
    ) -> bool:
        """Log a reasoning block.
        
        Args:
            thinking: Full thinking/analysis text (can be multi-line)
            topic: Short topic identifier (e.g., "slider-pattern", "logging-architecture")
            tags: Optional list of topic tags
            timestamp: Optional custom timestamp; defaults to now
        
        Returns:
            True if successful, False if failed
        """
        try:
            if timestamp is None:
                timestamp = datetime.now().strftime("%H:%M:%S")
            
            today = datetime.now().strftime("%Y-%m-%d")
            now_time = datetime.now().strftime("%H-%M-%S")
            
            # Create timestamped filename for this reasoning block
            log_file = self.log_dir / f"{today}_{now_time}_{topic}.md"
            
            # Build entry
            tags_str = " ".join([f"#{tag}" for tag in (tags or [])])
            
            entry = f"""# Reasoning Block — {topic}

**Time:** [{timestamp}]  
**Topic:** {topic}  
{f'**Tags:** {tags_str}' if tags_str else ''}

---

## Thinking Process

{thinking}

---

**Logged:** {datetime.now().isoformat()}
"""
            
            # Write to file
            log_file.write_text(entry)
            
            # Also append to daily reasoning log for searchability
            daily_log = self.log_dir / f"{today}_all-reasoning.md"
            
            if not daily_log.exists():
                daily_log.write_text(f"# All Reasoning Blocks — {today}\n\n")
            
            with open(daily_log, "a") as f:
                f.write(f"\n## [{timestamp}] {topic}\n")
                f.write(f"{thinking}\n\n")
            
            return True
        
        except Exception as e:
            print(f"ERROR logging reasoning: {e}", file=sys.stderr)
            return False


def log_reasoning_cli():
    """CLI interface for logging reasoning."""
    if len(sys.argv) < 2:
        print("Usage: python3 reasoning_logger.py <thinking_text> [topic] [tags...]")
        sys.exit(1)
    
    thinking = sys.argv[1]
    topic = sys.argv[2] if len(sys.argv) > 2 else "analysis"
    tags = sys.argv[3:] if len(sys.argv) > 3 else []
    
    logger = ReasoningLogger()
    success = logger.log_reasoning(thinking, topic, tags)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    log_reasoning_cli()
