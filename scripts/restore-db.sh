#!/bin/bash
# Restore PostgreSQL database from a backup file
# Usage: ./restore-db.sh /opt/voterslist/backups/daily/voter_db_2026-03-23_0200.sql.gz

set -euo pipefail

BACKUP_FILE="$1"
COMPOSE_FILE="/opt/voterslist/docker-compose.remote.yml"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lht /opt/voterslist/backups/daily/ 2>/dev/null
    echo "---"
    ls -lht /opt/voterslist/backups/weekly/ 2>/dev/null
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will REPLACE all current data with the backup."
echo "Backup file: $BACKUP_FILE"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

echo "[$(date)] Stopping app and worker containers..."
docker compose -f "$COMPOSE_FILE" stop app worker

echo "[$(date)] Restoring database from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T db psql -U "${DB_USER:-admin}" -d voter_db

echo "[$(date)] Restarting containers..."
docker compose -f "$COMPOSE_FILE" up -d

echo "[$(date)] Restore complete. Verify the application is working."
