#!/usr/bin/env bash
set -euo pipefail

# Host and remote paths
SSH_HOST=alterside_do
REMOTE_BACKEND_DIR=/root/apps/spatiabox
REMOTE_FRONTEND_DIR=/var/www/spatiabox

# Resolve repo root relative to this script so it can be run from anywhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_BACKEND_DIR="$ROOT_DIR/backend"
LOCAL_FRONTEND_DIR="$ROOT_DIR/webApplication"

echo "Using local backend dir: $LOCAL_BACKEND_DIR"
echo "Using local frontend dir: $LOCAL_FRONTEND_DIR"

if [ ! -d "$LOCAL_FRONTEND_DIR" ]; then
  echo "Frontend folder not found: $LOCAL_FRONTEND_DIR"
  exit 1
fi

echo "Building frontend..."
# Allow overriding API base at deploy time:
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api-spatiabox.alterside.io}"
(cd "$LOCAL_FRONTEND_DIR" && npm ci && VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build)

echo "Syncing frontend build to server..."
rsync -avz --delete "$LOCAL_FRONTEND_DIR/dist/" "$SSH_HOST:$REMOTE_FRONTEND_DIR/"

echo "Syncing backend source to server..."
rsync -avz --delete --exclude 'node_modules' --exclude '.git' "$LOCAL_BACKEND_DIR/" "$SSH_HOST:$REMOTE_BACKEND_DIR/"

echo "Installing backend dependencies on server, building there and restarting PM2..."
ssh "$SSH_HOST" bash -lc "set -e
cd $REMOTE_BACKEND_DIR
npm ci
# Build on server (tsc) if build script exists; ignore non-zero builds to avoid blocking if not necessary
npm run build || true
if pm2 describe spatiabox >/dev/null 2>&1; then
  pm2 restart spatiabox
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save
nginx -t && systemctl reload nginx || true
"

echo "Deploy complete."