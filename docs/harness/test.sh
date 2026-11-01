#!/usr/bin/env bash
# Build the gallery, then run the Playwright interaction tests against it.
set -euo pipefail
cd "$(dirname "$0")"
./build.sh
npx playwright test "$@"
