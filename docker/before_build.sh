#!/usr/bin/env bash
# Automatically executed by CI
set -e
pushd "$(dirname "$(readlink -f "$0")")/.." > /dev/null

rm -rf docker/package*.json docker/tsconfig.json docker/src/ || true
cp -f package*.json tsconfig.json docker/
cp -rf src/ docker/
