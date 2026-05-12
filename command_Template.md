# Command Template Guide

This guide provides standardized templates for creating commands in the Asta Bot. Follow these patterns to ensure consistency and proper functionality.

---

## 📋 Table of Contents

1. [Basic Command Structure](#basic-command-structure)
2. [Command Categories](#command-categories)
3. [Permission Levels](#permission-levels)
4. [Template Examples](#template-examples)
   - [General Command](#general-command-template)
   - [Admin Command](#admin-command-template)
   - [Owner Command](#owner-command-template)
   - [Economy Command](#economy-command-template)
   - [Game Command](#game-command-template)
   - [AI Command](#ai-command-template)
   - [Media Command](#media-command-template)
   - [Downloader Command](#downloader-command-template)
5. [Best Practices](#-best-practices)
6. [Reference Tables](#reference-tables)

---

## Basic Command Structure

Every command file must export a default object with the following structure:

```javascript
export default {
    name: 'commandname',
    aliases: ['alias1', 'alias2'],
    category: 'category',
    description: 'Brief description of what the command does',
    usage: 'commandname [arg1] [arg2]',
    example: 'commandname value1 value2',
    cooldown: 3,
    permissions: ['permission_level'],
    ownerOnly: false,
    adminOnly: false,
    groupOnly: false,
    privateOnly: false,
    botAdminRequired: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    
    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin, isOwner, isSudo, user, group, command, prefix }) {
        
    }
};
```

---

## Command Categories

Available categories for organizing commands:

- **admin** - Group administration and moderation
- **ai** - Artificial intelligence and chatbot features
- **downloader** - Media downloading from various platforms
- **economy** - Virtual economy, currency, and shop
- **fun** - Entertainment and miscellaneous fun commands
- **games** - Interactive games and puzzles
- **general** - General utility and information commands
- **media** - Media processing and manipulation
- **owner** - Bot owner exclusive commands
- **utility** - Useful tools and utilities

---

## Permission Levels

### Available Permissions

- **owner** - Bot owner only (defined in config.ownerNumbers)
- **admin** - Group admins or bot owner
- **premium** - Premium users or bot owner
- **user** - Regular users (when publicMode is enabled)
- **group** - Must be in a group
- **private** - Must be in private chat
- **botAdmin** - Bot must have admin privileges

### Sudo System

Users added via the `sudo` command can execute owner category commands. The permission system automatically treats sudo users as owners across all permission gates:
- Private mode access
- Owner-only commands
- Ban/mute exemptions
- Rate limiting bypass
- All permission types ('owner', 'admin', 'premium', 'user', 'botAdmin')

---

## Template Examples

### General Command Template

For basic commands without special permissions:

```javascript
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'example',
    aliases: ['ex', 'sample'],
    category: 'general',
    description: 'Example command description',
    usage: 'example <text>',
    example: 'example hello world',
    cooldown: 3,
    permissions: ['user'],
    minArgs: 1,

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const text = args.join(' ');
            
            if (!text) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('NO INPUT',
                        'Please provide some text',
                        'Usage: example <your text here>')
                }, { quoted: message });
            }
            
            const response = `╭──⦿【 ✨ EXAMPLE RESULT 】
│
│ 📝 𝗜𝗻𝗽𝘂𝘁: ${text}
│ 👤 𝗨𝘀𝗲𝗿: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│ ⏰ 𝗧𝗶𝗺𝗲: ${new Date().toLocaleTimeString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: response,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('EXECUTION FAILED',
                    'An error occurred while executing the command',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Admin Command Template

For group administration commands with mention/reply support:

```javascript
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'admincommand',
    aliases: ['admincmd'],
    category: 'admin',
    description: 'Description of admin command',
    usage: 'admincommand @user OR reply to message',
    example: 'admincommand @user',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return sock.sendMessage(from, {
                text: formatResponse.error('GROUP ONLY',
                    'This command can only be used in groups')
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return sock.sendMessage(from, {
                text: formatResponse.error('ADMIN ONLY',
                    'You need to be a group admin to use this command')
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return sock.sendMessage(from, {
                text: formatResponse.error('BOT NOT ADMIN',
                    'I need admin privileges to execute this command',
                    'Make me an admin first')
            }, { quoted: message });
        }

        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else {
                return sock.sendMessage(from, {
                    text: formatResponse.error('NO TARGET',
                        'Reply to a message or mention a user',
                        'Usage: admincommand @user OR reply to message')
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID TARGET',
                        'You cannot target yourself')
                }, { quoted: message });
            }

            const targetNumber = targetJid.split('@')[0];
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ ACTION COMPLETED 】
│
│ 👤 𝗧𝗮𝗿𝗴𝗲𝘁: @${targetNumber}
│ 👮 𝗕𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│ ⏰ 𝗧𝗶𝗺𝗲: ${new Date().toLocaleTimeString()}
│
╰────────────⦿`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('ACTION FAILED',
                    'Failed to execute admin action',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Owner Command Template

For bot owner exclusive commands (also accessible by sudo users):

```javascript
import config from '../../config.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'ownercommand',
    aliases: ['ownercmd'],
    category: 'owner',
    description: 'Description of owner command',
    usage: 'ownercommand <action> [args]',
    example: 'ownercommand action value',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, isOwner, isSudo }) {
        try {
            const action = args[0]?.toLowerCase();
            const value = args.slice(1).join(' ');
            
            if (!action) {
                return sock.sendMessage(from, {
                    text: `❌ *Invalid Action*

Available actions:
• action1 - Description of action1
• action2 - Description of action2
• action3 - Description of action3

*Usage:*
• ${config.prefix}ownercommand action1
• ${config.prefix}ownercommand action2 value

*Your Status:* ${isOwner ? 'Owner' : isSudo ? 'Sudo Admin' : 'User'}`
                }, { quoted: message });
            }

            switch (action) {
                case 'action1':
                    break;
                case 'action2':
                    if (!value) {
                        return sock.sendMessage(from, {
                            text: formatResponse.error('MISSING VALUE',
                                'Please provide a value for this action',
                                `Usage: ${config.prefix}ownercommand action2 <value>`)
                        }, { quoted: message });
                    }
                    break;
                default:
                    return sock.sendMessage(from, {
                        text: formatResponse.error('UNKNOWN ACTION',
                            `Action "${action}" not recognized`,
                            'Use the command without arguments to see available actions')
                    }, { quoted: message });
            }

            const response = `✅ *Action Completed*

*Action:* ${action}
*Value:* ${value || 'None'}
*Executed by:* @${sender.split('@')[0]} (${isOwner ? 'Owner' : 'Sudo Admin'})
*Date:* ${new Date().toLocaleString()}

Your owner command has been executed successfully.`;

            await sock.sendMessage(from, {
                text: response,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('EXECUTION ERROR',
                    'Failed to execute owner command',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Economy Command Template

For economy system commands with database interaction:

```javascript
import { getUser, updateUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'economycommand',
    aliases: ['ecocmd'],
    category: 'economy',
    description: 'Description of economy command',
    usage: 'economycommand [amount]',
    example: 'economycommand 100',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const amount = parseInt(args[0]) || 0;
            
            if (isNaN(amount) || amount < 1) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID AMOUNT',
                        'Please specify a valid amount greater than 0',
                        'Usage: economycommand <amount>')
                }, { quoted: message });
            }

            if (amount > 1000000) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('AMOUNT TOO LARGE',
                        'Maximum amount is $1,000,000',
                        'Please use a smaller amount')
                }, { quoted: message });
            }

            const currentBalance = user.economy?.balance || 0;
            if (currentBalance < amount) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INSUFFICIENT FUNDS',
                        `You need $${amount.toLocaleString()} but only have $${currentBalance.toLocaleString()}`,
                        'Earn more money with daily, work, or gamble commands')
                }, { quoted: message });
            }

            await updateUser(sender, {
                $inc: { 
                    'economy.balance': -amount,
                    'statistics.commandsUsed': 1
                }
            });

            const newBalance = currentBalance - amount;
            const response = `╭──⦿【 💰 TRANSACTION 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${sender.split('@')[0]}
│ 💵 𝗔𝗺𝗼𝘂𝗻𝘁: $${amount.toLocaleString()}
│ 💳 𝗣𝗿𝗲𝘃𝗶𝗼𝘂𝘀: $${currentBalance.toLocaleString()}
│ 💰 𝗡𝗲𝘄 𝗕𝗮𝗹𝗮𝗻𝗰𝗲: $${newBalance.toLocaleString()}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: response,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('TRANSACTION FAILED',
                    'An error occurred during the transaction',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Game Command Template

For interactive game commands with stats tracking:

```javascript
import { getUser, updateUser } from '../../models/User.js';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'gamecommand',
    aliases: ['game'],
    category: 'games',
    description: 'Description of game command',
    usage: 'gamecommand [difficulty]',
    example: 'gamecommand easy',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const difficulty = args[0]?.toLowerCase() || 'normal';
            const validDifficulties = ['easy', 'normal', 'hard'];
            
            if (!validDifficulties.includes(difficulty)) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID DIFFICULTY',
                        'Choose a valid difficulty level',
                        'Available: easy, normal, hard')
                }, { quoted: message });
            }

            const rewards = {
                easy: { xp: 50, money: 25 },
                normal: { xp: 100, money: 50 },
                hard: { xp: 200, money: 100 }
            };

            const reward = rewards[difficulty];
            const answer = Math.floor(Math.random() * 100) + 1;

            const gamePrompt = `╭──⦿【 🎮 GAME STARTED 】
│
│ 🎯 𝗚𝗮𝗺𝗲: Number Guessing Game
│ 👤 𝗣𝗹𝗮𝘆𝗲𝗿: @${sender.split('@')[0]}
│ ⚡ 𝗗𝗶𝗳𝗳𝗶𝗰𝘂𝗹𝘁𝘆: ${difficulty.toUpperCase()}
│ 🏆 𝗥𝗲𝘄𝗮𝗿𝗱: ${reward.xp} XP + $${reward.money}
│
│ 📝 Guess a number between 1 and 100!
│ Reply to this message with your guess.
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: gamePrompt,
                mentions: [sender]
            }, { quoted: message });

            await updateUser(sender, {
                $inc: { 
                    'gameStats.gamesPlayed': 1,
                    'statistics.commandsUsed': 1
                }
            });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('GAME ERROR',
                    'Failed to start the game',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### AI Command Template

For AI-powered commands with conversation context:

```javascript
import axios from 'axios';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'aicommand',
    aliases: ['ai', 'ask'],
    category: 'ai',
    description: 'Chat with AI assistant',
    usage: 'aicommand <your question>',
    example: 'aicommand What is the capital of France?',
    cooldown: 5,
    permissions: ['user'],
    minArgs: 1,

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const question = args.join(' ');
            
            if (!question) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('NO QUESTION',
                        'Please provide a question or message',
                        'Usage: aicommand <your question>')
                }, { quoted: message });
            }

            if (question.length > 500) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('QUESTION TOO LONG',
                        'Please keep your question under 500 characters',
                        `Current length: ${question.length}`)
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: '🤖 *Processing your request...*\n\nPlease wait while I think about this.'
            }, { quoted: message });

            const response = await axios.post('API_ENDPOINT', {
                prompt: question,
                user: sender
            });

            const aiReply = response.data?.answer || 'No response generated';

            const formattedResponse = `╭──⦿【 🤖 AI RESPONSE 】
│
│ 💭 𝗤𝘂𝗲𝘀𝘁𝗶𝗼𝗻: ${question.substring(0, 100)}${question.length > 100 ? '...' : ''}
│
│ 🎯 𝗔𝗻𝘀𝘄𝗲𝗿:
│ ${aiReply}
│
│ 👤 𝗨𝘀𝗲𝗿: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: formattedResponse,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('AI ERROR',
                    'Failed to get AI response',
                    error.message || 'API might be unavailable')
            }, { quoted: message });
        }
    }
};
```

---

### Media Command Template

For commands that process images, videos, or audio:

```javascript
import fs from 'fs-extra';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'mediacommand',
    aliases: ['media'],
    category: 'media',
    description: 'Process media files',
    usage: 'mediacommand (reply to image/video)',
    example: 'Reply to image and type: mediacommand',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        try {
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quotedMessage) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('NO MEDIA',
                        'Please reply to an image or video',
                        'Usage: Reply to media and type: mediacommand')
                }, { quoted: message });
            }

            const messageType = Object.keys(quotedMessage)[0];
            const validTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
            
            if (!validTypes.includes(messageType)) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID MEDIA',
                        'Please reply to an image, video, or audio file',
                        `Detected type: ${messageType}`)
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: '⏳ *Processing media...*\n\nPlease wait while I process your file.'
            }, { quoted: message });

            const buffer = await downloadMediaMessage(
                { message: quotedMessage },
                'buffer',
                {}
            );

            if (!buffer) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('DOWNLOAD FAILED',
                        'Failed to download media file')
                }, { quoted: message });
            }

            const tempDir = path.join(process.cwd(), 'temp');
            await fs.ensureDir(tempDir);
            const tempFile = path.join(tempDir, `media_${Date.now()}.${messageType === 'imageMessage' ? 'jpg' : 'mp4'}`);
            await fs.writeFile(tempFile, buffer);

            const response = `╭──⦿【 ✅ MEDIA PROCESSED 】
│
│ 📁 𝗧𝘆𝗽𝗲: ${messageType.replace('Message', '')}
│ 📊 𝗦𝗶𝘇𝗲: ${(buffer.length / 1024).toFixed(2)} KB
│ 👤 𝗨𝘀𝗲𝗿: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                text: response,
                mentions: [sender]
            }, { quoted: message });

            await fs.remove(tempFile);

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('PROCESSING FAILED',
                    'Failed to process media file',
                    error.message)
            }, { quoted: message });
        }
    }
};
```

---

### Downloader Command Template

For commands that download content from external sources:

```javascript
import axios from 'axios';
import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'downloadcommand',
    aliases: ['dl', 'download'],
    category: 'downloader',
    description: 'Download content from URL',
    usage: 'downloadcommand <url> [quality]',
    example: 'downloadcommand https://example.com/video hd',
    cooldown: 15,
    permissions: ['user'],
    minArgs: 1,

    async execute({ sock, message, args, from, sender, user }) {
        try {
            const url = args[0];
            const quality = args[1]?.toLowerCase() || 'sd';
            
            if (!url) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('NO URL',
                        'Please provide a URL to download',
                        'Usage: downloadcommand <url> [quality]')
                }, { quoted: message });
            }

            const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
            if (!urlPattern.test(url)) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID URL',
                        'Please provide a valid URL',
                        'Example: https://example.com/video')
                }, { quoted: message });
            }

            const validQualities = ['sd', 'hd', '4k'];
            if (!validQualities.includes(quality)) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID QUALITY',
                        'Choose a valid quality option',
                        'Available: sd, hd, 4k')
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `⏳ *Downloading...*

📥 URL: ${url}
📺 Quality: ${quality.toUpperCase()}

Please wait, this may take a few moments.`
            }, { quoted: message });

            const response = await axios.get('DOWNLOAD_API_ENDPOINT', {
                params: { url, quality }
            });

            if (!response.data?.downloadUrl) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('DOWNLOAD FAILED',
                        'Could not download content from this URL',
                        'The URL might be invalid or unsupported')
                }, { quoted: message });
            }

            const caption = `╭──⦿【 ✅ DOWNLOAD COMPLETE 】
│
│ 📥 𝗨𝗥𝗟: ${url.substring(0, 50)}...
│ 📺 𝗤𝘂𝗮𝗹𝗶𝘁𝘆: ${quality.toUpperCase()}
│ 👤 𝗥𝗲𝗾𝘂𝗲𝘀𝘁𝗲𝗱 𝗯𝘆: @${sender.split('@')[0]}
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│
╰────────────⦿`;

            await sock.sendMessage(from, {
                video: { url: response.data.downloadUrl },
                caption: caption,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('DOWNLOAD ERROR',
                    'Failed to download content',
                    error.message || 'Service might be unavailable')
            }, { quoted: message });
        }
    }
};
```

---

## 🎯 Best Practices

### 1. Error Handling
Always wrap command logic in try-catch blocks and provide meaningful error messages using `formatResponse.error()`.

### 2. Input Validation
Validate all user inputs before processing:
- Check if required arguments are provided
- Validate data types (numbers, URLs, etc.)
- Sanitize user input to prevent injection
- Set reasonable limits on input length

### 3. User Mentions
When mentioning users in responses, always include them in the `mentions` array:
```javascript
mentions: [sender, targetJid]
```

### 4. Quoted Messages
Always quote the original message for context:
```javascript
{ quoted: message }
```

### 5. Reply and Mention Handling
Support both reply-to-message and mention methods:
```javascript
const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

let targetJid;
if (quotedUser) {
    targetJid = quotedUser;
} else if (mentionedUsers.length > 0) {
    targetJid = mentionedUsers[0];
}
```

### 6. Consistent Formatting
Use the standardized box format for all responses:
```
╭──⦿【 TITLE 】
│
│ Field: Value
│ Field: Value
│
╰────────────⦿
```

### 7. Date and Time Formatting
Use consistent date and time formatting:
```javascript
new Date().toLocaleDateString()
new Date().toLocaleTimeString()
new Date().toLocaleString()
```

### 8. Number Formatting
Format large numbers for readability:
```javascript
amount.toLocaleString()
```

### 9. Permission Checks
For admin commands, verify all required permissions in order:
1. `isGroup` - Command is used in a group
2. `isGroupAdmin` - User is a group admin
3. `isBotAdmin` - Bot has admin privileges

### 10. Database Operations
Always use the model functions and handle errors:
```javascript
import { getUser, updateUser } from '../../models/User.js';
import { getGroup, updateGroup } from '../../models/Group.js';
```

### 11. Self-Targeting Prevention
Prevent users from targeting themselves in admin actions:
```javascript
if (targetJid === sender) {
    return sock.sendMessage(from, {
        text: formatResponse.error('INVALID TARGET',
            'You cannot target yourself')
    }, { quoted: message });
}
```

### 12. Media Handling
When downloading media:
- Always clean up temporary files
- Validate media types
- Check file sizes
- Handle download failures gracefully

### 13. API Integration
For external API calls:
- Implement proper error handling
- Set reasonable timeouts
- Validate API responses
- Provide fallback messages

### 14. No Code Comments
Do not add comments to command code. The code should be self-explanatory with clear variable names and structure.

### 15. Resource Cleanup
Always clean up temporary files, connections, and resources:
```javascript
await fs.remove(tempFile);
```

---

## 📦 Required Imports

### Common Imports
```javascript
import formatResponse from '../../utils/formatUtils.js';
```

### For Database Commands
```javascript
import { getUser, updateUser } from '../../models/User.js';
import { getGroup, updateGroup } from '../../models/Group.js';
```

### For Owner Commands
```javascript
import config from '../../config.js';
```

### For Canvas/Image Commands
```javascript
import { createWelcomeImage, createLevelUpImage, createProfileCard } from '../../utils/canvasUtils.js';
```

### For Media Commands
```javascript
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs-extra';
import path from 'path';
```

### For API Commands
```javascript
import axios from 'axios';
```

---

## Reference Tables

### ✅ Command Properties Reference

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ | Command name (lowercase, no spaces) |
| `aliases` | array | ❌ | Alternative names for the command |
| `category` | string | ✅ | Command category (admin, ai, economy, etc.) |
| `description` | string | ✅ | Brief description of command functionality |
| `usage` | string | ✅ | How to use the command with parameters |
| `example` | string | ❌ | Example usage with real values |
| `cooldown` | number | ❌ | Cooldown in seconds (default: 0) |
| `permissions` | array | ❌ | Required permissions (owner, admin, etc.) |
| `ownerOnly` | boolean | ❌ | Owner/sudo only command |
| `adminOnly` | boolean | ❌ | Admin only command (group) |
| `groupOnly` | boolean | ❌ | Group only command |
| `privateOnly` | boolean | ❌ | Private chat only |
| `botAdminRequired` | boolean | ❌ | Bot needs admin rights |
| `minArgs` | number | ❌ | Minimum arguments required |
| `maxArgs` | number | ❌ | Maximum arguments allowed |
| `typing` | boolean | ❌ | Show typing indicator |
| `execute` | function | ✅ | Main command execution function |

---

### 🔧 Execute Function Parameters

The execute function receives a destructured object with these parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `sock` | object | WhatsApp socket connection |
| `message` | object | Original message object with full context |
| `args` | array | Command arguments (space-separated) |
| `from` | string | Chat/Group JID where command was sent |
| `sender` | string | Sender JID (user who sent command) |
| `isGroup` | boolean | True if message is from a group |
| `isGroupAdmin` | boolean | True if sender is a group admin |
| `isBotAdmin` | boolean | True if bot has admin privileges |
| `isOwner` | boolean | True if sender is the bot owner |
| `isSudo` | boolean | True if sender is a sudo user (bot admin) |
| `user` | object | User database object with full profile |
| `group` | object | Group database object (if applicable) |
| `command` | string | Command name that was used |
| `prefix` | string | Command prefix that was used |

---

### 🎨 formatResponse Utility Reference

```javascript
import formatResponse from '../../utils/formatUtils.js';

formatResponse.error(
    'ERROR TITLE',
    'Main error description',
    'Additional helpful information or suggestion'
);

formatResponse.info(
    'INFO TITLE',
    ['Info line 1', 'Info line 2', 'Info line 3']
);

formatResponse.success(
    'SUCCESS TITLE',
    'Success message description'
);
```

---

### 📝 Message Type Detection

Common message types to check:
```javascript
const messageType = Object.keys(quotedMessage)[0];

const validTypes = {
    text: 'conversation' or 'extendedTextMessage',
    image: 'imageMessage',
    video: 'videoMessage',
    audio: 'audioMessage',
    document: 'documentMessage',
    sticker: 'stickerMessage'
};
```

---

## 🚀 Testing Your Command

### Pre-Deployment Checklist

1. ✅ Place command file in the appropriate category folder
2. ✅ Restart the bot to load the new command
3. ✅ Test success scenario with valid inputs
4. ✅ Test all error scenarios (invalid input, missing args, etc.)
5. ✅ Verify permission checks work correctly
6. ✅ Test cooldown functionality
7. ✅ Verify database operations (if applicable)
8. ✅ Check response formatting and mentions
9. ✅ Test with both mentions and reply-to-message (if applicable)
10. ✅ Verify resource cleanup (temp files, etc.)
11. ✅ Test in both group and private chat (if applicable)
12. ✅ Verify bot admin requirements (if applicable)

---

## 📂 File Structure Example

```
src/commands/
├── admin/
│   ├── kick.js
│   ├── ban.js
│   ├── warn.js
│   └── antilink.js
├── owner/
│   ├── sudo.js
│   ├── eval.js
│   └── broadcast.js
├── general/
│   ├── profile.js
│   ├── help.js
│   └── ping.js
├── economy/
│   ├── daily.js
│   ├── balance.js
│   └── transfer.js
├── games/
│   ├── trivia.js
│   ├── slot.js
│   └── dice.js
├── ai/
│   ├── chatgpt.js
│   └── gemini.js
├── media/
│   ├── sticker.js
│   └── toimage.js
└── downloader/
    ├── ytdl.js
    ├── tiktok.js
    └── instagram.js
```

---

## 🔍 Common Patterns

### Pattern: Time-based Cooldown Check
```javascript
const lastUsed = user.cooldowns?.[command.name];
const cooldownTime = 3600000;

if (lastUsed && Date.now() - lastUsed < cooldownTime) {
    const timeLeft = Math.ceil((cooldownTime - (Date.now() - lastUsed)) / 1000);
    return formatResponse.error('COOLDOWN', `Wait ${timeLeft} seconds`);
}
```

### Pattern: Progressive Rewards
```javascript
const level = user.economy?.level || 1;
const baseReward = 100;
const reward = baseReward * level;
```

### Pattern: Random Selection
```javascript
const options = ['option1', 'option2', 'option3'];
const selected = options[Math.floor(Math.random() * options.length)];
```

### Pattern: Percentage Calculation
```javascript
const percentage = Math.round((value / total) * 100);
const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
```

---

*Template Guide for Asta Bot v1.0.0*
*Last Updated: October 2025*
*Follow these templates to maintain code quality and consistency across all commands*
