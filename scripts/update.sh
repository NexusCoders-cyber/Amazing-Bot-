#!/bin/bash

set -e

echo "🔄 Ilom WhatsApp Bot - Update Script"
echo "===================================="
echo ""

echo "📥 Fetching latest changes from repository..."
git fetch origin

CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: ${CURRENT_BRANCH}"
echo ""

if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes!"
    echo "Creating backup before update..."
    
    ./scripts/backup.sh
    
    read -p "Continue with update? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Update cancelled."
        exit 0
    fi
    
    git stash push -m "Auto-stash before update $(date)"
fi

echo "⬇️  Pulling latest changes..."
git pull origin ${CURRENT_BRANCH}

echo ""
echo "📦 Updating dependencies..."

if command -v pnpm &> /dev/null; then
    pnpm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi

echo ""
echo "✅ Update completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Review CHANGELOG.md for breaking changes"
echo "2. Update your .env if needed"
echo "3. Restart the bot: ./scripts/restart.sh"
