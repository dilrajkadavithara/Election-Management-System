#!/bin/bash
# Daily PostgreSQL backup for IntelHub Election Management System
# Keeps last 7 daily + 4 weekly backups

set -euo pipefail

BACKUP_DIR="/opt/voterslist/backups"
COMPOSE_FILE="/opt/voterslist/docker-compose.remote.yml"
DATE=$(date +%Y-%m-%d_%H%M)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

echo "[$(date)] Starting database backup..."

# Dump the database from the running postgres container
docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U "${DB_USER:-admin}" -d voter_db --clean --if-exists | gzip > "$BACKUP_DIR/daily/voter_db_${DATE}.sql.gz"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/daily/voter_db_${DATE}.sql.gz" | cut -f1)
echo "[$(date)] Daily backup complete: voter_db_${DATE}.sql.gz ($BACKUP_SIZE)"

# Weekly backup on Sundays
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$BACKUP_DIR/daily/voter_db_${DATE}.sql.gz" "$BACKUP_DIR/weekly/voter_db_weekly_${DATE}.sql.gz"
    echo "[$(date)] Weekly backup saved."
fi

# Retention: keep last 7 daily, last 4 weekly
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true

echo "[$(date)] Backup rotation complete. Current backups:"
ls -lh "$BACKUP_DIR/daily/" 2>/dev/null
echo "---"
ls -lh "$BACKUP_DIR/weekly/" 2>/dev/null
