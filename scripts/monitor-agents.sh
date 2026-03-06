#!/bin/bash
# Monitor Claude Code agents and log their status
LOGFILE="/tmp/agent-monitor.log"
PIDS="86428 84849 84815"

while true; do
    echo "=== $(date '+%H:%M:%S') ===" >> $LOGFILE
    for pid in $PIDS; do
        if ps -p $pid > /dev/null 2>&1; then
            cpu=$(ps -p $pid -o %cpu= 2>/dev/null)
            mem=$(ps -p $pid -o %mem= 2>/dev/null)
            echo "PID $pid: ALIVE (CPU:${cpu}% MEM:${mem}%)" >> $LOGFILE
        else
            echo "PID $pid: DEAD" >> $LOGFILE
        fi
    done
    
    # Check for new files created by agents
    find /Users/claudia/.openclaw/workspace/projects/emotivx-app/ -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.png" | xargs ls -lt 2>/dev/null | head -5 >> $LOGFILE
    echo "" >> $LOGFILE
    sleep 30
done
