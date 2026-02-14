# Make scripts executable
chmod +x scripts/deploy.sh
chmod +x scripts/backup-database.sh

# Deploy to production
./scripts/deploy.sh

# Create backup
./scripts/backup-database.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f api-gateway

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api-gateway=3



# FINAL DEPLOYEYMENT COMMANDS
./scripts/setup-server.sh

# Setup SSL certificates
./scripts/ssl-setup.sh emailsuite.com admin@emailsuite.com

# Deploy application
./scripts/deploy.sh

# Setup monitoring
docker-compose -f docker-compose.prod.yml up -d prometheus grafana

# Verify deployment
curl https://api.emailsuite.com/health