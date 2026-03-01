# Media Directory

This directory contains runtime media files managed by the bot.

## Subdirectories

### `/profile`
User and group profile pictures cached from WhatsApp

### `/stickers`
Generated and cached sticker files

### `/downloads`
Downloaded media from various commands (YouTube, Instagram, etc.)

### `/cache`
Temporary media cache for faster processing

## Automatic Cleanup

The cleanup script (`npm run cleanup`) will periodically clean old files from these directories while preserving important data.

## File Retention

- Profile pictures: Permanent
- Stickers: 30 days
- Downloads: 7 days
- Cache: 24 hours
