#!/bin/bash

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="asta_bot_backup_${TIMESTAMP}"

echo "💾 Ilom WhatsApp Bot - Backup Script"
echo "===================================="
echo ""

mkdir -p "${BACKUP_DIR}/database"
mkdir -p "${BACKUP_DIR}/session"
mkdir -p "${BACKUP_DIR}/media"

echo "📦 Creating backup: ${BACKUP_NAME}"
echo ""

if [ -d "./cache/auth_info_baileys" ]; then
    echo "📁 Backing up session data..."
    tar -czf "${BACKUP_DIR}/session/${BACKUP_NAME}_session.tar.gz" ./cache/auth_info_baileys
    echo "✅ Session backup created"
fi

if [ -d "./session" ]; then
    echo "📁 Backing up legacy session..."
    tar -czf "${BACKUP_DIR}/session/${BACKUP_NAME}_legacy.tar.gz" ./session
    echo "✅ Legacy session backup created"
fi

if [ -d "./media" ]; then
    echo "📁 Backing up media files..."
    tar -czf "${BACKUP_DIR}/media/${BACKUP_NAME}_media.tar.gz" ./media
    echo "✅ Media backup created"
fi

if [ -f ".env" ]; then
    echo "📁 Backing up environment file..."
    cp .env "${BACKUP_DIR}/${BACKUP_NAME}.env"
    echo "✅ Environment backup created"
fi

echo ""
echo "✅ Backup completed successfully!"
echo "📍 Location: ${BACKUP_DIR}"
echo ""
echo "Backup files:"
ls -lh "${BACKUP_DIR}"/**/*${TIMESTAMP}* 2>/dev/null || echo "  (Check ${BACKUP_DIR} directory)"
