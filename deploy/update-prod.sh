#!/usr/bin/env bash
# Met à jour le site en ligne (VPS) sans toucher à nginx / HTTPS.
#
# Depuis ton Mac (racine du repo) :
#   npm run deploy:prod
# ou :
#   ./deploy/update-prod.sh
#
# Variables optionnelles :
#   DEPLOY_SSH   (défaut : root@lotr-tcg-online.raphael-bigot.info)
#   DEPLOY_DIR   (défaut : /var/www/lotr-tcg)
#   DEPLOY_BRANCH (défaut : main)
set -euo pipefail

DEPLOY_SSH="${DEPLOY_SSH:-root@lotr-tcg-online.raphael-bigot.info}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/lotr-tcg}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> Déploiement → $DEPLOY_SSH:$DEPLOY_DIR (branche $DEPLOY_BRANCH)"
echo "    (nginx / certificats : non modifiés)"

ssh -o BatchMode=yes "$DEPLOY_SSH" bash -s -- "$DEPLOY_DIR" "$DEPLOY_BRANCH" <<'REMOTE'
set -euo pipefail
APP_DIR="$1"
BRANCH="$2"
cd "$APP_DIR"
echo "==> git fetch / checkout / pull"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
echo "==> npm ci (si besoin) + build front"
npm ci
npx vite build
echo "==> redémarrage lotr-game"
systemctl restart lotr-game
systemctl --no-pager --full status lotr-game | head -20
echo "==> OK — https://lotr-tcg-online.raphael-bigot.info"
REMOTE

echo "==> Terminé."
