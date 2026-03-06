#!/bin/bash
# Voice reply script - uses macOS 'say' command
# Usage: voice_reply.sh "Text to speak" [output_file]

TEXT="$1"
OUTPUT_AIFF="/tmp/voice_reply_$(date +%s).aiff"
OUTPUT_OPUS="${2:-/tmp/voice_reply_$(date +%s).opus}"

say -v "Kate (Enhanced)" -o "$OUTPUT_AIFF" --file-format=AIFF "$TEXT"
ffmpeg -y -i "$OUTPUT_AIFF" -c:a libopus "$OUTPUT_OPUS" 2>/dev/null
rm "$OUTPUT_AIFF"

echo "$OUTPUT_OPUS"
