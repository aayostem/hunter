# #!/bin/sh
# set -e

# echo "🚀 Starting EmailSuite Backend..."
# echo "⏳ Running migrations..."

# node_modules/.bin/prisma migrate deploy

# echo "✅ Migrations complete"
# echo "🌐 Starting server on port 10000..."

# exec node dist/index.js


#!/bin/sh
set -e

echo "🚀 Starting EmailSuite Backend..."
echo "🌐 Starting server on port 10000..."

exec node dist/index.js