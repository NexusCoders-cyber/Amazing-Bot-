#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "❌ Error: No backup timestamp provided"
    echo ""
    echo "Usage: ./scripts/restore.sh TIMESTAMP"
    echo ""
    echo "Available backups:"
    ls -1 ./backups/session/*_session.tar.gz 2>/dev/null | sed 's/.*backup_/  /' | sed 's/_session.*//' || echo "  No backups found"
    exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="./backups"
BACKUP_NAME="asta_bot_backup_${TIMESTAMP}"

echo "♻️  Ilom WhatsApp Bot - Restore Script"
echo "====================================="
echo ""
echo "⚠️  WARNING: This will overwrite current data!"
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "📦 Restoring from backup: ${BACKUP_NAME}"
echo ""

if [ -f "${BACKUP_DIR}/session/${BACKUP_NAME}_session.tar.gz" ]; then
    echo "📁 Restoring session data..."
    rm -rf ./cache/auth_info_baileys
    tar -xzf "${BACKUP_DIR}/session/${BACKUP_NAME}_session.tar.gz"
    echo "✅ Session restored"
fi

if [ -f "${BACKUP_DIR}/session/${BACKUP_NAME}_legacy.tar.gz" ]; then
    echo "📁 Restoring legacy session..."
    rm -rf ./session
    tar -xzf "${BACKUP_DIR}/session/${BACKUP_NAME}_legacy.tar.gz"
    echo "✅ Legacy session restored"
fi

if [ -f "${BACKUP_DIR}/media/${BACKUP_NAME}_media.tar.gz" ]; then
    echo "📁 Restoring media files..."
    rm -rf ./media
    tar -xzf "${BACKUP_DIR}/media/${BACKUP_NAME}_media.tar.gz"
    echo "✅ Media restored"
fi

if [ -f "${BACKUP_DIR}/${BACKUP_NAME}.env" ]; then
    echo "📁 Restoring environment file..."
    cp "${BACKUP_DIR}/${BACKUP_NAME}.env" .env
    echo "✅ Environment restored"
fi

echo ""
echo "✅ Restore completed successfully!"
echo "🔄 Restart the bot to apply changes"
