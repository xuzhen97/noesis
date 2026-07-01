#!/usr/bin/env bash
# ponytail: one-liner wrapped in a script for discoverability
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git submodule update --init --recursive
