#!/bin/sh
set -e

echo "🚀 Starting EmailSuite Backend..."
echo "⏳ Checking migrations..."

# Run migrations with timeout - don't block server start if it hangs
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma || echo "⚠️ Migration skipped - run manually"

echo "✅ Starting server..."
exec node dist/index.js