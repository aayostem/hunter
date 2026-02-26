#!/bin/sh
set -e

echo "🚀 Starting EmailSuite Backend..."

echo "⏳ Running migrations..."
npx prisma migrate deploy

echo "✅ Migrations complete"
echo "🌐 Starting server..."

exec node dist/index.js