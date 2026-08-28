#!/bin/bash
# ============================================================
# Havens VPS Bootstrap Script
# Run this ONCE on a fresh Hostinger KVM Ubuntu 22.04 VPS
# Usage: bash deploy/setup.sh
# ============================================================
set -e  # Exit immediately on any error

echo ""
echo "=================================================="
echo "  Havens VPS Setup — Hostinger KVM Ubuntu 22.04"
echo "=================================================="
echo ""

# ─── 1. System update ────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── 2. Install Docker ───────────────────────────────────────
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully."
else
    echo "Docker already installed."
fi

# ─── 3. Install Docker Compose plugin ───────────────────────
echo "[3/8] Installing Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi
echo "Docker Compose: $(docker compose version)"

# ─── 4. Install Nginx ────────────────────────────────────────
echo "[4/8] Installing Nginx..."
apt-get install -y nginx
systemctl enable nginx
systemctl stop nginx   # Docker Nginx will take over port 80/443

# ─── 5. Install Certbot (Let's Encrypt SSL) ──────────────────
echo "[5/8] Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx
echo "Certbot ready."

# ─── 6. Install Git ──────────────────────────────────────────
echo "[6/8] Installing Git..."
apt-get install -y git

# ─── 7. Clone repository ─────────────────────────────────────
echo "[7/8] Cloning Havens repository..."
REPO_DIR="/opt/havens"

if [ -d "$REPO_DIR" ]; then
    echo "Repository already exists at $REPO_DIR — pulling latest..."
    cd "$REPO_DIR"
    git pull origin main
else
    git clone https://github.com/Juanes068/HAVENS.git "$REPO_DIR"
    cd "$REPO_DIR"
fi

# ─── 8. Create .env file ─────────────────────────────────────
echo "[8/8] Creating .env file..."

if [ -f "$REPO_DIR/.env" ]; then
    echo ".env already exists — skipping creation. Edit manually if needed."
else
cat > "$REPO_DIR/.env" << 'EOF'
# ===== EDIT THESE VALUES BEFORE RUNNING DOCKER COMPOSE =====

# Django
SECRET_KEY=CHANGE_ME_TO_A_LONG_RANDOM_STRING
DEBUG=False
DJANGO_ENV=production
ALLOWED_HOSTS=havensapp.com,www.havensapp.com,api.havensapp.com

# Database
DB_NAME=havens_db
DB_USER=root
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_HOST=db
DB_PORT=3306

# Redis
REDIS_URL=redis://redis:6379/1
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Cloudinary (for media/image storage)
CLOUDINARY_CLOUD_NAME=g8jffrmx
CLOUDINARY_API_KEY=463119879725683
CLOUDINARY_API_SECRET=CHANGE_ME_CLOUDINARY_SECRET

# Email (Resend SMTP)
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=CHANGE_ME_RESEND_API_KEY
DEFAULT_FROM_EMAIL=Havens <info@havensapp.com>

# Google Maps (for VPS build; also set in docker-compose.prod.yml args)
VITE_GOOGLE_MAPS_API_KEY=CHANGE_ME_GOOGLE_MAPS_KEY
EOF
    echo ""
    echo "⚠️  .env file created at $REPO_DIR/.env"
    echo "⚠️  PLEASE EDIT IT NOW with your actual credentials before continuing!"
    echo ""
fi

echo ""
echo "=================================================="
echo "  Setup complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/havens/.env with your real credentials"
echo "  2. Run:  cd /opt/havens && bash deploy/deploy.sh"
echo ""
