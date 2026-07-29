#!/usr/bin/env bash
set -euo pipefail
SSH_HOST=alterside_do
REMOTE_BACKEND_DIR=/root/apps/spatiabox
REMOTE_FRONTEND_DIR=/var/www/spatiabox
LOCAL_BACKEND_DIR=./backend
LOCAL_FRONTEND_DIR=./webApplication

echo "Building frontend..."
(cd "$LOCAL_FRONTEND_DIR" && npm ci && npm run build)

echo "Syncing frontend build to server..."
rsync -avz --delete "$LOCAL_FRONTEND_DIR/dist/" "$SSH_HOST:$REMOTE_FRONTEND_DIR/"

echo "Syncing backend source to server..."
rsync -avz --delete --exclude 'node_modules' --exclude '.git' "$LOCAL_BACKEND_DIR/" "$SSH_HOST:$REMOTE_BACKEND_DIR/"

echo "Installing backend dependencies and restarting PM2 on server..."
ssh "$SSH_HOST" <<'SSH_EOF'
set -e
mkdir -p /root/apps/spatiabox
cd /root/apps/spatiabox
npm ci --production
if pm2 describe spatiabox >/dev/null 2>&1; then
  pm2 restart spatiabox
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save
nginx -t && systemctl reload nginx
SSH_EOF

echo "Deploy complete."

