#!/usr/bin/env bash
set -euo pipefail

# P0 placeholder backup script.
# Usage:
#   ./infra/scripts/backup-postgres.sh

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="./backups/postgres"
mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump -U writer seshat > "$BACKUP_DIR/seshat-$TIMESTAMP.sql"

echo "Backup written to $BACKUP_DIR/seshat-$TIMESTAMP.sql"
