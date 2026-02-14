#!/bin/bash

set -e

echo "🚀 Starting Email Suite deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Build and deploy
echo "🐳 Building and deploying Docker containers..."
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.prod.yml exec api-gateway npx prisma migrate deploy

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

# Health check
echo "🏥 Performing health check..."
sleep 30
curl -f https://api.emailsuite.com/health || exit 1

echo "✅ Deployment completed successfully!"