#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
rm -rf src/templates && cp -r ../../src src/templates
