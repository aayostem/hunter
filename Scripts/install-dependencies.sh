#!/bin/bash

set -e

echo "🚀 Installing Email Suite Dependencies..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version must be >= 18.0.0. Current version: $NODE_VERSION"
    exit 1
fi

echo "✅ Node.js version check passed: $NODE_VERSION"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install web dashboard dependencies
echo "🎨 Installing web dashboard dependencies..."
cd frontend/web-dashboard
npm install
cd ../..

# Install chrome extension dependencies
echo "🔌 Installing chrome extension dependencies..."
cd frontend/chrome-extension
npm install
cd ../..

# Install JavaScript client dependencies
echo "📚 Installing JavaScript client dependencies..."
cd clients/javascript
npm install
cd ../..

# Setup Python client
echo "🐍 Setting up Python client..."
cd clients/python
pip install -e .
cd ../..

echo "✅ All dependencies installed successfully!"
echo ""
echo "🎯 Next steps:"
echo "   1. Run 'npm run db:migrate' to setup database"
echo "   2. Run 'npm run dev' to start development servers"
echo "   3. Run 'npm run build' to build for production"