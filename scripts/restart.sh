#!/bin/bash

echo "🔄 Restarting Ilom WhatsApp Bot..."
echo ""

./scripts/stop.sh

sleep 2

./scripts/start.sh
