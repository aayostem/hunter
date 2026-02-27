#!/bin/sh
set -e

echo "🚀 Starting EmailSuite Backend..."
echo "⏳ Running migrations..."

node_modules/.bin/prisma migrate deploy

echo "✅ Migrations complete"
echo "🌐 Starting server..."

exec dumb-init node dist/index.js