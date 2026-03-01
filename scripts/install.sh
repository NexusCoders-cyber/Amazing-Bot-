#!/bin/bash

set -e

echo "🚀 Ilom WhatsApp Bot - Installation Script"
echo "=========================================="
echo ""

NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")

if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Error: Node.js 20 or higher is required"
    echo "Current version: $(node -v 2>/dev/null || echo 'Not installed')"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version check passed: v$(node -v)"
echo ""

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
        echo "⚠️  Please configure your .env file with proper credentials"
    else
        echo "⚠️  No .env file found. Please create one manually."
    fi
fi

echo "📦 Installing dependencies..."
echo ""

if command -v pnpm &> /dev/null; then
    echo "Using pnpm..."
    pnpm install
elif command -v yarn &> /dev/null; then
    echo "Using yarn..."
    yarn install
else
    echo "Using npm..."
    npm install
fi

echo ""
echo "🔧 Setting up project directories..."
node -e "
const fs = require('fs-extra');
const dirs = [
    'src/commands/admin', 'src/commands/ai', 'src/commands/downloader',
    'src/commands/economy', 'src/commands/fun', 'src/commands/games',
    'src/commands/general', 'src/commands/media', 'src/commands/owner',
    'src/commands/utility', 'temp/downloads', 'temp/uploads', 'temp/stickers',
    'temp/audio', 'temp/video', 'temp/documents', 'logs', 'session',
    'backups/database', 'backups/session', 'backups/media',
    'media/profile', 'media/stickers', 'media/downloads', 'media/cache'
];
dirs.forEach(dir => fs.ensureDirSync(dir));
console.log('✅ Directories created successfully');
"

echo ""
echo "✅ Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your .env file with SESSION_ID and OWNER_NUMBERS"
echo "2. Run 'npm start' or 'node index.js' to start the bot"
echo "3. Scan the QR code with your WhatsApp"
echo ""
echo "🔗 Documentation: ./docs/guides/installation.md"
echo "💬 Support: https://github.com/NexusCoders-cyber/Amazing-Bot-/issues"
