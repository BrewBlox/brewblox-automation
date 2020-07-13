#!/usr/bin/env bash
# Automatically executed by CI
set -e
pushd "$(dirname "$(readlink -f "$0")")/.." > /dev/null

cp -f package*.json tsconfig.json docker/
cp -rf src/ docker/
