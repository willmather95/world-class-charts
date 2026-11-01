#!/usr/bin/env bash
# shot.sh WIDTH HEIGHT OUT [light|dark]
# Renders dist/index.html inside an iframe of exactly WIDTH px, because headless Chrome
# clamps small windows (about 500px) and would otherwise lay out phones too wide.
set -euo pipefail
cd "$(dirname "$0")"
W=$(( $1 < 600 ? 600 : $1 ))
"${CHROME_PATH:-google-chrome}" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --force-prefers-reduced-motion \
  --virtual-time-budget=5000 --window-size="$W,$2" --screenshot="$3" "file://$PWD/dist/frame.html?w=$1&h=$2&t=${4:-}" 2>/dev/null
