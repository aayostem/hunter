#!/bin/bash

set -e

echo "🛠️ Setting up Email Suite Development Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Start development services
echo "🐳 Starting development services (PostgreSQL, Redis)..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Install dependencies
echo "📦 Installing project dependencies..."
./scripts/install-dependencies.sh

# Setup database
echo "🗄️ Setting up database..."
npm run db:migrate

# Build projects
echo "🔨 Building projects..."
npm run build

echo "✅ Development environment setup completed!"
echo ""
echo "🎯 You can now start the development servers:"
echo "   - Backend API: npm run dev:backend"
echo "   - Web Dashboard: npm run dev:dashboard"
echo "   - Chrome Extension: npm run dev:extension"
echo "   - All services: npm run dev"