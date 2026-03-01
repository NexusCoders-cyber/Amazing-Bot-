# Events Documentation

## Overview

The bot's event system handles various WhatsApp interactions including messages, group changes, reactions, and more.

## Event Handlers

### Message Events

#### messageCreate
**File**: `src/events/messageCreate.js`
- Triggers when a new message is received
- Processes text, media, and quoted messages
- Handles command execution
- Manages reply handlers

#### messageUpdate
**File**: `src/events/messageUpdate.js`
- Triggers when a message is edited
- Updates cached message data
- Logs modifications

#### messageDelete
**File**: `src/events/messageDelete.js`
- Triggers when a message is deleted
- Anti-delete functionality
- Preserves deleted content

### Group Events

#### groupJoin
**File**: `src/events/groupJoin.js`
- Welcomes new members
- Sends canvas welcome cards
- Updates member count
- Sends group rules (if configured)

#### groupLeave
**File**: `src/events/groupLeave.js`
- Farewell messages for leaving members
- Canvas goodbye cards
- Updates statistics
- Logs member departures

#### groupUpdate
**File**: `src/events/groupUpdate.js`
- Group subject (name) changes
- Group description updates
- Group settings modifications
- Announcements for changes

### Connection Events

#### connectionUpdate
**File**: `src/events/connectionUpdate.js`
- Connection state changes
- QR code generation
- Reconnection handling
- Session management

#### ready
**File**: `src/events/ready.js`
- Bot initialization complete
- Load commands and plugins
- Setup scheduled tasks
- Send startup notification

#### error
**File**: `src/events/error.js`
- Global error handling
- Error logging
- Error notifications to owner
- Recovery attempts

### Reaction Events

#### messageReaction
**File**: `src/events/messageReaction.js`
- Reaction additions
- Reaction removals
- Custom reaction handlers
- Reaction statistics

#### autoReaction
**File**: `src/events/autoReaction.js`
- Context-aware automatic reactions
- Keyword-based reactions
- Emoji mapping
- Response triggers

### Level System Events

#### levelUp
**File**: `src/events/levelUp.js`
- XP milestone detection
- Level-up notifications
- Canvas celebration cards
- Reward distribution
- Leaderboard updates

## Event Configuration

### Enabling/Disabling Events

Events can be controlled via config:

```javascript
features: {
    welcome: process.env.WELCOME_ENABLED === 'true',
    goodbye: process.env.GOODBYE_ENABLED === 'true',
    autoReaction: process.env.AUTO_REACTION === 'true',
    antiDelete: process.env.ANTI_DELETE_ENABLED === 'true'
}
```

### Custom Event Handlers

Create new event handlers in `src/events/`:

```javascript
export default async function customEvent(sock, data) {
    try {
        // Event logic here
    } catch (error) {
        console.error('Event error:', error);
    }
}
```

## Event Flow

### Message Processing
1. Message received
2. Extract content and metadata
3. Check user permissions
4. Process commands or triggers
5. Update user stats
6. Send response

### Group Join Flow
1. New member detected
2. Fetch member info
3. Generate welcome card
4. Send welcome message
5. Update member count
6. Log join event

### Level Up Flow
1. XP threshold reached
2. Calculate new level
3. Generate level card
4. Send celebration
5. Award rewards
6. Update leaderboard

## Best Practices

### Performance
- Use async/await properly
- Handle errors gracefully
- Avoid blocking operations
- Cache when possible

### Error Handling
- Always use try/catch
- Log errors properly
- Provide fallbacks
- Notify on critical errors

### User Experience
- Quick response times
- Clear notifications
- Informative messages
- Visual feedback

## Examples

### Simple Event Handler

```javascript
export default async function myEvent(sock, data) {
    try {
        const { from, message } = data;
        
        await sock.sendMessage(from, {
            text: 'Event triggered!'
        });
    } catch (error) {
        console.error('Event error:', error);
    }
}
```

### Advanced Event with Canvas

```javascript
import { createCanvas } from '@napi-rs/canvas';

export default async function visualEvent(sock, data) {
    try {
        const { from, user } = data;
        
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, 800, 400);
        
        const imageBuffer = canvas.toBuffer('image/png');
        
        await sock.sendMessage(from, {
            image: imageBuffer,
            caption: 'Visual notification!'
        });
    } catch (error) {
        console.error('Canvas event error:', error);
    }
}
```

## Troubleshooting

### Event Not Firing
- Check if event is enabled in config
- Verify event file exists
- Check event registration
- Review error logs

### Slow Event Processing
- Optimize canvas operations
- Cache frequently used data
- Use async operations
- Reduce API calls

### Memory Issues
- Clear old event data
- Limit canvas buffer size
- Implement garbage collection
- Monitor memory usage

## Support

For event-related issues, refer to:
- Event handler files in `src/events/`
- Main event router in `src/handlers/eventHandler.js`
- Configuration in `src/config.js`
- Error logs in `logs/error.log`
