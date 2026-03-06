#!/bin/bash
# Browser Relay Monitor - Checks status every 10 minutes

while true; do
    echo "[$(date)] Checking browser relay status..."
    
    # Check browser status
    BROWSER_STATUS=$(curl -s http://127.0.0.1:18792/status 2>/dev/null | grep -o '"running":true' || echo "DOWN")
    
    if [[ "$BROWSER_STATUS" == "DOWN" ]]; then
        echo "[$(date)] ⚠️  Browser relay DOWN - attempting restart..."
        # Could add restart command here
        echo "[$(date)] Browser relay issue detected - add to tomorrow's fix list" >> /Users/claudia/.openclaw/workspace/browser-relay-issues.log
    else
        echo "[$(date)] ✅ Browser relay ONLINE"
    fi
    
    sleep 600  # Check every 10 minutes
done