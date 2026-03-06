#!/usr/bin/env python3
"""
Discord Log Puller
Pulls recent messages from Discord channels and logs them locally
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

# Try to import discord.py; if not available, provide graceful fallback
try:
    import discord
    DISCORD_AVAILABLE = True
except ImportError:
    DISCORD_AVAILABLE = False
    print("Warning: discord.py not installed. Install with: pip install discord.py", file=sys.stderr)

from conversation_logger import ConversationLogger


class DiscordLogPuller:
    """Pull recent messages from Discord channels."""
    
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("DISCORD_BOT_TOKEN")
        if not self.token:
            raise ValueError("DISCORD_BOT_TOKEN not set in environment")
        
        if DISCORD_AVAILABLE:
            self.client = discord.Client(intents=discord.Intents.default())
        else:
            self.client = None
        
        self.logger = ConversationLogger()
        self.channels = {
            # Channel ID: (name, pull_limit)
            1469099426810429555: ("family-matters", 50),
        }
    
    async def pull_channel(self, channel_id: int, channel_name: str, limit: int = 50):
        """Pull recent messages from a Discord channel.
        
        Args:
            channel_id: Discord channel ID
            channel_name: Friendly name for log file
            limit: How many messages to pull
        """
        if not self.client:
            print(f"Error: Discord client not available", file=sys.stderr)
            return
        
        try:
            channel = self.client.get_channel(channel_id)
            if not channel:
                print(f"Warning: Channel {channel_id} not found", file=sys.stderr)
                return
            
            # Get last N messages
            messages = []
            async for message in channel.history(limit=limit):
                messages.append(message)
            
            # Reverse to chronological order
            messages.reverse()
            
            # Log each message
            today = datetime.now().strftime("%Y-%m-%d")
            log_file = Path(f"/Users/claudia/.openclaw/workspace/memory/conversation-logs/{today}_discord-{channel_name}.md")
            
            # Create header if new file
            if not log_file.exists():
                log_file.write_text(f"# Discord Log — {channel_name} ({today})\n\n")
            
            logged_count = 0
            for message in messages:
                # Skip bot messages and empty messages
                if message.author.bot or not message.content:
                    continue
                
                # Skip very old messages (older than 24 hours)
                if datetime.now(message.created_at.tzinfo) - message.created_at > timedelta(hours=24):
                    continue
                
                timestamp = message.created_at.strftime("%H:%M:%S")
                author = message.author.name
                content = message.content.replace("\n", " | ")[:500]  # Cap at 500 chars
                
                entry = f"[{timestamp}] {author}: {content}\n"
                
                with open(log_file, "a") as f:
                    f.write(entry)
                
                logged_count += 1
            
            print(f"✅ Logged {logged_count} messages from #{channel_name}")
        
        except Exception as e:
            print(f"Error pulling channel {channel_id}: {e}", file=sys.stderr)
    
    async def run(self):
        """Connect to Discord and pull all channels."""
        if not self.client:
            print("Discord not available, skipping pull", file=sys.stderr)
            return
        
        try:
            async with self.client:
                await self.client.start(self.token)
        except Exception as e:
            print(f"Error connecting to Discord: {e}", file=sys.stderr)


# Fallback: Use HTTP API instead of discord.py
def pull_discord_via_http(token: str, channel_ids: dict):
    """Pull Discord messages using HTTP API (no discord.py required)."""
    import json
    import subprocess
    
    for channel_id, (channel_name, limit) in channel_ids.items():
        try:
            # Use curl to fetch messages from Discord API
            headers = f"-H 'Authorization: Bot {token}'"
            url = f"https://discord.com/api/v10/channels/{channel_id}/messages?limit={limit}"
            
            result = subprocess.run(
                f"curl -s {headers} {url}",
                shell=True,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print(f"Error fetching from Discord API: {result.stderr}", file=sys.stderr)
                continue
            
            messages = json.loads(result.stdout)
            
            # Log messages
            today = datetime.now().strftime("%Y-%m-%d")
            log_file = Path(f"/Users/claudia/.openclaw/workspace/memory/conversation-logs/{today}_discord-{channel_name}.md")
            
            if not log_file.exists():
                log_file.write_text(f"# Discord Log — {channel_name} ({today})\n\n")
            
            logged_count = 0
            for msg in messages:
                if msg.get("author", {}).get("bot"):
                    continue
                
                timestamp = datetime.fromisoformat(msg["timestamp"].replace("Z", "+00:00")).strftime("%H:%M:%S")
                author = msg["author"]["username"]
                content = msg["content"].replace("\n", " | ")[:500]
                
                entry = f"[{timestamp}] {author}: {content}\n"
                with open(log_file, "a") as f:
                    f.write(entry)
                
                logged_count += 1
            
            print(f"✅ Logged {logged_count} messages from #{channel_name}")
        
        except Exception as e:
            print(f"Error pulling {channel_id}: {e}", file=sys.stderr)


if __name__ == "__main__":
    token = os.getenv("DISCORD_BOT_TOKEN")
    if not token:
        print("Error: DISCORD_BOT_TOKEN not set", file=sys.stderr)
        sys.exit(1)
    
    channels = {
        1469099426810429555: ("family-matters", 50),
    }
    
    if DISCORD_AVAILABLE:
        # Use discord.py (preferred)
        import asyncio
        
        puller = DiscordLogPuller(token)
        asyncio.run(puller.run())
    else:
        # Fallback to HTTP API
        print("Using HTTP API fallback (discord.py not installed)")
        pull_discord_via_http(token, channels)
