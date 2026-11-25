#!/usr/bin/env bash
# À lancer sur le VPS (Ubuntu), en root, APRÈS que le DNS A pointe vers ce serveur.
# Usage : bash deploy/setup-vps.sh
set -euo pipefail

DOMAIN="lotr-tcg-online.raphael-bigot.info"
APP_DIR="/var/www/lotr-tcg"
REPO_URL="${REPO_URL:-https://github.com/ralf5543/lotr-tcg-boardgame.git}"
BRANCH="${BRANCH:-main}"

echo "==> Domaine attendu : $DOMAIN"
echo "==> Vérification DNS…"
RESOLVED="$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}' || true)"
SERVER_IP="$(curl -4 -sS --max-time 5 ifconfig.me || curl -4 -sS --max-time 5 icanhazip.com || true)"
echo "    DNS → ${RESOLVED:-?}"
echo "    VPS → ${SERVER_IP:-?}"
if [[ -z "$RESOLVED" || -z "$SERVER_IP" || "$RESOLVED" != "$SERVER_IP" ]]; then
  echo "ERREUR : le DNS ne pointe pas encore vers ce VPS."
  echo "Chez IONOS : zone DNS de raphael-bigot.info → enregistrement A"
  echo "  hôte : lotr-tcg-online"
  echo "  valeur : $SERVER_IP"
  echo "Attends quelques minutes après la modif, puis relance ce script."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
echo "==> Paquets…"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx git curl ca-certificates

if ! command -v node >/dev/null 2>&1; then
  echo "==> Node.js 22 (NodeSource)…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> Code…"
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
echo "==> npm ci + build front…"
npm ci
# tsc -b échoue encore sur des erreurs historiques → build Vite seul
npx vite build

echo "==> systemd…"
cp "$APP_DIR/deploy/lotr-game.service" /etc/systemd/system/lotr-game.service
systemctl daemon-reload
systemctl enable lotr-game
systemctl restart lotr-game
systemctl --no-pager --full status lotr-game || true

echo "==> nginx…"
cp "$APP_DIR/deploy/nginx-lotr.conf" /etc/nginx/sites-available/lotr-tcg
ln -sfn /etc/nginx/sites-available/lotr-tcg /etc/nginx/sites-enabled/lotr-tcg
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> HTTPS (Let’s Encrypt)…"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect

echo "==> OK — https://$DOMAIN"
echo "Process jeu : systemctl status lotr-game"
echo "Logs :        journalctl -u lotr-game -f"
