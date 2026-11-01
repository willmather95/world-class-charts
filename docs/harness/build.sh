#!/usr/bin/env bash
# Typecheck every template, then build the gallery page into dist/.
set -euo pipefail
cd "$(dirname "$0")"
./sync.sh
npx tsc --noEmit -p .
mkdir -p dist
npx esbuild src/Gallery.tsx --bundle --minify --outfile=dist/app.js --jsx=automatic --define:process.env.NODE_ENV='"production"' --log-level=warning
npx @tailwindcss/cli -i src/app.css -o dist/app.css --minify 2>/dev/null
cp -n frame.html dist/ 2>/dev/null || true
cat > dist/index.html <<'H'
<!doctype html><html lang="en"><head><meta charset="utf-8"><title>world-class-charts gallery</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>
H
echo "built dist/index.html"
