#!/bin/bash
# ─────────────────────────────────────────────────────────────
# build-pages.sh — make the GitHub Pages version of the game.
#
#   bash build-pages.sh
#
# Produces the game's static export in out/. Two ways to use it:
#   • Test locally:  mkdir -p /tmp/p/awoolfolk && cp -r out /tmp/p/awoolfolk/game
#     && python3 -m http.server 8000 -d /tmp/p
#     then open http://localhost:8000/awoolfolk/game/
#   • Publish: push to GitHub and let .github/workflows/pages.yml do it
#     (it combines the portfolio at the root + this export under game/),
#     or by hand: copy out/* into the game/ folder of your awoolfolk repo.
#
# BASE_PATH is where the game lives on Pages. The portfolio holds the repo
# root, so the game deploys UNDER it (default: /awoolfolk/game).
# ─────────────────────────────────────────────────────────────
set -e
STATIC_EXPORT=1 BASE_PATH="${BASE_PATH:-/awoolfolk/game}" npm run build
echo ""
echo "Done. The game export is in ./out — its CONTENTS belong in the repo's game/ folder (or let the workflow publish it)."
