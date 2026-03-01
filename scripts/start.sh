#!/bin/bash

echo "🚀 Starting Ilom WhatsApp Bot..."
echo ""

if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Please create .env file with your configuration"
    echo ""
fi

if command -v pm2 &> /dev/null; then
    echo "Using PM2 process manager..."
    pm2 start ecosystem.config.js
    pm2 logs ilom-bot
else
    echo "Using Node.js directly..."
    node index.js
fi
