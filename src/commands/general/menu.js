import fs from 'fs';
import path from 'path';
import font from '../../utils/font.js';

const startTime = Date.now();

function getUptime() {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

async function getAllCommands() {
    const commandsPath = path.join(process.cwd(), 'src', 'commands');
    const categories = {};
    let totalCommands = 0;

    const scanDirectory = async (dir, category = '') => {
        const items = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                await scanDirectory(fullPath, item.name);
            } else if (item.name.endsWith('.js')) {
                try {
                    const command = await import('file://' + fullPath);
                    const cmd = command.default;

                    if (cmd && cmd.name) {
                        const cat = cmd.category || category || 'general';
                        
                        if (!categories[cat]) {
                            categories[cat] = [];
                        }

                        categories[cat].push({
                            name: cmd.name,
                            aliases: cmd.aliases || [],
                            description: cmd.description || 'No description',
                            usage: cmd.usage || cmd.name,
                            permissions: cmd.permissions || ['user']
                        });

                        totalCommands++;
                    }
                } catch (e) {
                    console.error(`Failed to load ${fullPath}:`, e.message);
                }
            }
        }
    };

    try {
        await scanDirectory(commandsPath);
    } catch (e) {
        console.error('Failed to scan commands:', e);
    }

    return { categories, totalCommands };
}

const categoryEmojis = {
    owner: '👑',
    admin: '⚙️',
    media: '🎬',
    downloader: '📥',
    fun: '🎮',
    games: '🎯',
    tools: '🔧',
    entertainment: '🎭',
    general: '📂',
    utility: '🛠️'
};

export default {
    name: 'menu',
    aliases: ['m'],
    category: 'general',
    description: 'Display bot command menu',
    usage: 'menu [category]',
    example: 'menu\nmenu media',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,

    async execute({ sock, message, args, from, sender, prefix }) {
        const { categories, totalCommands } = await getAllCommands();

        if (args.length > 0) {
            const requestedCat = args[0].toLowerCase();
            const categoryCommands = categories[requestedCat];

            if (!categoryCommands) {
                return await sock.sendMessage(from, {
                    text: `❌ Category ${font.italic(requestedCat)} not found\n\nUse ${font.monospace(prefix + 'menu')} to see all categories`
                }, { quoted: message });
            }

            const emoji = categoryEmojis[requestedCat] || '📂';
            let msg = `${emoji} ${font.boldScript(requestedCat.toUpperCase())}\n\n`;
            msg += `${font.sans('Commands:')} ${categoryCommands.length}\n`;
            msg += `━━━━━━━━━━━━━━━\n\n`;

            categoryCommands.forEach((cmd, i) => {
                msg += `${font.bold((i + 1) + '. ' + cmd.name)}\n`;
                
                if (cmd.aliases.length > 0) {
                    msg += `   ${font.italic('Aliases:')} ${cmd.aliases.join(', ')}\n`;
                }
                
                msg += `   ${font.italic('Usage:')} ${prefix}${cmd.usage}\n`;
                msg += `   ${cmd.description}\n\n`;
            });

            return await sock.sendMessage(from, { text: msg }, { quoted: message });
        }

        const botName = process.env.BOT_NAME || 'WhatsApp Bot';
        const ownerNumber = process.env.OWNER_NUMBER || 'Unknown';

        let menuText = `${font.boldScript(botName)}\n\n`;
        menuText += `${font.monospace('Prefix:')} ${prefix}\n`;
        menuText += `${font.monospace('Commands:')} ${totalCommands}\n`;
        menuText += `${font.monospace('Uptime:')} ${getUptime()}\n`;
        menuText += `${font.monospace('Owner:')} ${ownerNumber}\n\n`;
        menuText += `━━━━━━━━━━━━━━━\n\n`;
        menuText += `${font.bold('📚 CATEGORIES')}\n\n`;

        const sortedCategories = Object.keys(categories).sort();

        sortedCategories.forEach((cat) => {
            const emoji = categoryEmojis[cat] || '📂';
            const count = categories[cat].length;
            menuText += `${emoji} ${font.bold(cat.charAt(0).toUpperCase() + cat.slice(1))} ${font.italic('(' + count + ')')}\n`;
        });

        menuText += `\n━━━━━━━━━━━━━━━\n\n`;
        menuText += `${font.sans('Reply with category name')}\n`;
        menuText += `${font.italic('Example:')} media`;

        const sentMsg = await sock.sendMessage(from, {
            text: menuText
        }, { quoted: message });

        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }

        global.replyHandlers[sentMsg.key.id] = {
            command: 'menu',
            handler: async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;
                if (replySender !== sender) return;

                const requestedCat = replyText.trim().toLowerCase();
                const categoryCommands = categories[requestedCat];

                if (!categoryCommands) return;

                delete global.replyHandlers[sentMsg.key.id];

                const emoji = categoryEmojis[requestedCat] || '📂';
                let msg = `${emoji} ${font.boldScript(requestedCat.toUpperCase())}\n\n`;
                msg += `${font.sans('Commands:')} ${categoryCommands.length}\n`;
                msg += `━━━━━━━━━━━━━━━\n\n`;

                categoryCommands.forEach((cmd, i) => {
                    msg += `${font.bold((i + 1) + '. ' + cmd.name)}\n`;
                    
                    if (cmd.aliases.length > 0) {
                        msg += `   ${font.italic('Aliases:')} ${cmd.aliases.join(', ')}\n`;
                    }
                    
                    msg += `   ${font.italic('Usage:')} ${prefix}${cmd.usage}\n`;
                    msg += `   ${cmd.description}\n\n`;
                });

                await sock.sendMessage(from, { text: msg }, { quoted: replyMessage });
            }
        };
    }
};