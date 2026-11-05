#!/usr/bin/env bash
# Builds the app + presentation and publishes dist/ to the gh-pages branch (GitHub Pages).
# Live URL: https://narongdechpas-coder.github.io/natto/
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
SRC=$(git -C "$ROOT" rev-parse --short HEAD)
npx vite build
touch "$ROOT/dist/.nojekyll"
TMP=$(mktemp -d)
cp -r "$ROOT/dist/." "$TMP/"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy NATTO demo and presentation (build of $SRC)"
git remote add origin "$(git -C "$ROOT" remote get-url origin)"
git push -f origin gh-pages
rm -rf "$TMP"
echo "Deployed build of $SRC → https://narongdechpas-coder.github.io/natto/"
