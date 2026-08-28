#!/bin/bash
# ============================================================
# Havens Production Deploy Script
# Run this every time you want to update the production server
# Usage: cd /opt/havens && bash deploy/deploy.sh
# ============================================================
set -e

REPO_DIR="/opt/havens"
cd "$REPO_DIR"

echo ""
echo "=================================================="
echo "  Havens — Deploying to Production"
echo "=================================================="
echo ""

# ─── Step 1: Pull latest code ────────────────────────────────
echo "[1/5] Pulling latest code from GitHub..."
git pull origin main

# ─── Step 2: Build and start containers ──────────────────────
echo "[2/5] Building and starting Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# ─── Step 3: Run database migrations ─────────────────────────
echo "[3/5] Running database migrations..."
sleep 10   # Wait for DB to be fully ready
docker exec havens-web-app python manage.py migrate --noinput

# ─── Step 4: Collect static files ────────────────────────────
echo "[4/5] Collecting static files..."
docker exec havens-web-app python manage.py collectstatic --noinput

# ─── Step 5: Health check ────────────────────────────────────
echo "[5/5] Running health check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health/ || echo "000")

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "   Frontend: https://havensapp.com"
    echo "   Backend:  https://api.havensapp.com/graphql/"
    echo "   Admin:    https://api.havensapp.com/admin/"
else
    echo ""
    echo "⚠️  Health check returned HTTP $HTTP_STATUS — check logs:"
    echo "   docker logs havens-web-app --tail 50"
fi

echo ""
echo "=================================================="
echo "  Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "=================================================="
echo ""
