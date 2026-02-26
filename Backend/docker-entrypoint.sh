#!/bin/sh
set -e

echo "🚀 Starting EmailSuite Backend..."

echo "⏳ Running migrations..."
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy

echo "✅ Migrations complete"
echo "🌐 Starting server..."

exec dumb-init node dist/index.js