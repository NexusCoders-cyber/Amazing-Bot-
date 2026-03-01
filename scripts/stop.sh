#!/bin/bash

echo "🛑 Stopping Ilom WhatsApp Bot..."
echo ""

if command -v pm2 &> /dev/null; then
    pm2 stop ilom-bot 2>/dev/null || echo "Bot not running in PM2"
    pm2 delete ilom-bot 2>/dev/null || true
    echo "✅ Bot stopped"
else
    pkill -f "node index.js" 2>/dev/null && echo "✅ Bot stopped" || echo "⚠️  Bot not running"
fi
