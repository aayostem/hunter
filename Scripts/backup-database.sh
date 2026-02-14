#!/bin/bash

set -e

# Timestamp for backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="emailsuite_backup_${TIMESTAMP}.sql"

echo "💾 Starting database backup: $BACKUP_FILE"

# Create backup
docker-compose exec postgres pg_dump \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    > backups/$BACKUP_FILE

# Compress backup
gzip backups/$BACKUP_FILE

echo "✅ Backup completed: backups/${BACKUP_FILE}.gz"

# Remove backups older than 7 days
find backups/ -name "emailsuite_backup_*.sql.gz" -mtime +7 -delete

echo "🧹 Cleaned up old backups"