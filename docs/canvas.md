# Canvas Graphics Guide

## Overview

This bot uses `@napi-rs/canvas` for creating stunning visual graphics including welcome cards, goodbye cards, level-up notifications, and command visuals.

## Features

### Visual Cards
- **Welcome Cards**: Beautiful gradient backgrounds with user avatars
- **Goodbye Cards**: Stylish farewell notifications
- **Level-Up Cards**: XP progression celebration graphics
- **Info Cards**: Bot information and stats displays
- **Owner Cards**: Professional developer contact cards

## Canvas Implementation

### Basic Setup

```javascript
import { createCanvas } from '@napi-rs/canvas';

const canvas = createCanvas(1200, 700);
const ctx = canvas.getContext('2d');
```

### Gradient Backgrounds

```javascript
const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
gradient.addColorStop(0, '#667eea');
gradient.addColorStop(0.5, '#764ba2');
gradient.addColorStop(1, '#f093fb');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

### Text Rendering

```javascript
ctx.font = 'bold 70px Arial';
ctx.fillStyle = '#ffffff';
ctx.textAlign = 'center';
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.fillText('Welcome!', 600, 100);
```

### Rounded Rectangles

```javascript
ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
ctx.roundRect(100, 200, 1000, 350, 15);
ctx.fill();
```

## Commands Using Canvas

### Info Command
Location: `src/commands/general/info.js`
- System information display
- Bot statistics
- Performance metrics

### Owner Command
Location: `src/commands/general/owner.js`
- Developer contact information
- Service offerings
- Professional branding

### Fun Fact Command
Location: `src/commands/fun/funfact.js`
- Interesting facts with visual appeal
- Dynamic text wrapping
- Engaging presentation

## Canvas Events

### Welcome Event
File: `src/events/groupJoin.js`
- Triggered when a user joins a group
- Displays user avatar and name
- Shows member count

### Goodbye Event
File: `src/events/groupLeave.js`
- Triggered when a user leaves
- Farewell message with visuals
- Updated member statistics

### Level Up Event
File: `src/events/levelUp.js`
- XP milestone celebrations
- Visual rewards display
- Progress tracking

## Best Practices

### Performance
- Use canvas only when needed
- Cache frequently used graphics
- Optimize image sizes
- Handle errors gracefully

### Design
- Consistent color schemes
- Readable font sizes
- Proper text alignment
- Shadow effects for depth

### Error Handling

```javascript
try {
    const imageBuffer = await createCard();
    await sock.sendMessage(from, {
        image: imageBuffer,
        caption: text
    });
} catch (error) {
    await sock.sendMessage(from, {
        text: fallbackText
    });
}
```

## Color Palettes

### Professional
- Primary: #667eea
- Secondary: #764ba2
- Accent: #f093fb

### Vibrant
- Primary: #11998e
- Secondary: #38ef7d
- Accent: #00d2ff

### Royal
- Primary: #8e2de2
- Secondary: #4a00e0
- Accent: #7f00ff

## Typography

### Recommended Fonts
- Headers: Bold 70-80px Arial
- Subheaders: Bold 50-60px Arial
- Body: Regular 30-40px Arial
- Footer: Regular 25-30px Arial

## Troubleshooting

### Common Issues

**Canvas fails to create:**
- Check if @napi-rs/canvas is installed
- Verify Node.js version (20+)
- Check memory availability

**Text not wrapping:**
- Implement word wrapping logic
- Calculate text metrics
- Adjust line height

**Colors not showing:**
- Verify hex color format
- Check alpha channel values
- Ensure gradient stops are correct

## Examples

### Simple Card

```javascript
async createSimpleCard() {
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#667eea';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 50px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Hello World!', 400, 200);
    
    return canvas.toBuffer('image/png');
}
```

### Advanced Card with Avatar

```javascript
async createAdvancedCard(avatarUrl, name) {
    const canvas = createCanvas(1200, 700);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 1200, 700);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 700);
    
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`Welcome ${name}!`, 600, 500);
    
    return canvas.toBuffer('image/png');
}
```

## Resources

- [@napi-rs/canvas Documentation](https://github.com/Brooooooklyn/canvas)
- [HTML5 Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Canvas Examples](https://www.html5canvastutorials.com/)

## Support

For canvas-related issues:
1. Check Node.js version compatibility
2. Verify package installation
3. Review error logs
4. Contact bot owner for assistance
