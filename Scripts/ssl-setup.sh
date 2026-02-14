#!/bin/bash

set -e

echo "🔐 Setting up SSL certificates..."

DOMAIN=${1:-"emailsuite.com"}
EMAIL=${2:-"admin@emailsuite.com"}

# Install certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Create SSL directory
mkdir -p /etc/nginx/ssl

# Obtain SSL certificate
certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Create SSL configuration
cat > /etc/nginx/ssl/ssl.conf << EOF
ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# HSTS (ngx_http_headers_module is required) (63072000 seconds)
add_header Strict-Transport-Security "max-age=63072000" always;
EOF

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "✅ SSL setup completed for $DOMAIN"