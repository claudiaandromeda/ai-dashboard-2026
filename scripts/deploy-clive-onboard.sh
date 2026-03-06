#!/bin/bash
# Deploy and run Clive's onboarding handler on the VPS
# Usage: ./deploy-clive-onboard.sh <BOT_TOKEN> <OPENROUTER_KEY>

BOT_TOKEN="$1"
OPENROUTER_KEY="$2"
VPS="root@72.62.213.83"
KEY="$HOME/.ssh/clive_vps_ed25519"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no"
SCP="scp -i $KEY -o StrictHostKeyChecking=no"

if [ -z "$BOT_TOKEN" ] || [ -z "$OPENROUTER_KEY" ]; then
    echo "Usage: $0 <BOT_TOKEN> <OPENROUTER_KEY>"
    exit 1
fi

echo "=== Deploying onboarding script to VPS ==="
$SCP "$(dirname "$0")/clive-onboard.py" "$VPS:/root/.openclaw/workspace/scripts/clive-onboard.py"
$SSH "$VPS" "mkdir -p /root/.openclaw/workspace/scripts"
echo "✅ Script copied"

echo "=== Running onboarding handler ==="
$SSH "$VPS" "
export CLIVE_BOT_TOKEN='$BOT_TOKEN'
export CLIVE_OPENROUTER_KEY='$OPENROUTER_KEY'
export XDG_RUNTIME_DIR=/run/user/0
cd /root/.openclaw/workspace
nohup python3 scripts/clive-onboard.py > /tmp/clive-onboard.log 2>&1 &
echo \$! > /tmp/clive-onboard.pid
echo \"Onboarding handler started (PID \$(cat /tmp/clive-onboard.pid))\"
"
echo "✅ Running. Tail logs with:"
echo "   ssh -i $KEY $VPS 'tail -f /tmp/clive-onboard.log'"
