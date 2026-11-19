#!/bin/bash
# ─────────────────────────────────────────────────────────────
# build-pages.sh — make the GitHub Pages version of the game.
#
#   bash build-pages.sh
#
# Produces the complete static site in out/. Two ways to use it:
#   • Test locally:  mkdir -p /tmp/p/Andre-legends && cp -r out/* /tmp/p/Andre-legends/
#     && python3 -m http.server 8000 -d /tmp/p
#     then open http://localhost:8000/Andre-legends/
#   • Publish: push to GitHub and let .github/workflows/pages.yml do it
#     or copy the contents of out/ to the root of the GitHub Pages artifact.
#
# BASE_PATH must match the GitHub repository name for a project Pages site.
# This repo publishes at /Andre-legends; the game route is /Andre-legends/game/.
# ─────────────────────────────────────────────────────────────
set -e
STATIC_EXPORT=1 BASE_PATH="${BASE_PATH:-/Andre-legends}" npm run build
echo ""
echo "Done. The complete static site is in ./out — let the GitHub Actions workflow publish it."
