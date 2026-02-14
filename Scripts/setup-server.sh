#!/bin/bash

set -e

echo "🛠️ Setting up production server..."

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/emailsuite/{backups,logs,ssl}

# Create non-root user for Docker
useradd -s /bin/bash -m -d /home/emailsuite -c "Email Suite" emailsuite
usermod -aG docker emailsuite

# Setup logging
mkdir -p /var/log/emailsuite
chown emailsuite:emailsuite /var/log/emailsuite

# Configure firewall
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Setup log rotation
cat > /etc/logrotate.d/emailsuite << EOF
/var/log/emailsuite/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

echo "✅ Server setup completed!"