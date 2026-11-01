#!/usr/bin/env bash
# Copies the skill's templates in, so the demo uses the same tokens, ChartCard and format.ts.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf src/templates && cp -r ../../../src src/templates
