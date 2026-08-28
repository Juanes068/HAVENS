#!/bin/bash
# ============================================================
# Havens SSL Certificate Setup (Let's Encrypt via Certbot)
# Run this AFTER the containers are already running
# Usage: bash deploy/ssl.sh
# ============================================================
set -e

DOMAIN="havensapp.com"
EMAIL="trianajuan95@gmail.com"   # Replace with your real email for cert renewal alerts

echo ""
echo "=================================================="
echo "  Setting up SSL for $DOMAIN"
echo "=================================================="
echo ""

# Stop existing nginx to free port 80 for certbot standalone
echo "Stopping Docker Nginx temporarily..."
docker stop $(docker ps -q --filter "ancestor=nginx:alpine") 2>/dev/null || true

# Obtain certificate
echo "Obtaining SSL certificate for $DOMAIN and api.$DOMAIN..."
certbot certonly \
    --standalone \
    --agree-tos \
    --no-eff-email \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    -d "api.$DOMAIN"

echo ""
echo "✅ SSL certificate obtained!"
echo "   Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "   Key:         /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""

# Restart all production containers (Nginx will now use the certificate)
echo "Restarting all containers..."
cd /opt/havens
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "✅ HTTPS is now active!"
echo "   Visit: https://$DOMAIN"
echo ""
echo "Certificate auto-renewal is handled by the certbot container."
echo "To manually renew: docker exec <certbot-container> certbot renew"
