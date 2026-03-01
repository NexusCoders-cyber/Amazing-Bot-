import config from '../../config.js';

export default {
    name: 'help2',
    aliases: ['h2', 'commands2'],
    category: 'general',
    description: 'Show all commands or get info about a specific command',
    usage: 'help [command]',
    example: 'help ping',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,

    async execute({ sock, message, args, from, sender, prefix, isOwner, isSudo, pushName }) {
        const { getAllCommands, getAllCategories, getCommandsByCategory, getCommand } = await import('../../utils/commandManager.js');

        if (args[0]) {
            const cmdName = args[0].toLowerCase().replace(prefix, '');
            const cmd = getCommand(cmdName);

            if (!cmd) {
                return await sock.sendMessage(from, {
                    text: `Command "${cmdName}" not found.\n\nType ${prefix}help to see all commands.`
                }, { quoted: message });
            }

            const lines = [
                `Command: ${cmd.name}`,
                `Category: ${cmd.category || 'general'}`,
                `Description: ${cmd.description || 'No description'}`,
                `Usage: ${prefix}${cmd.usage || cmd.name}`,
                `Example: ${prefix}${cmd.example || cmd.name}`,
                `Aliases: ${cmd.aliases?.length ? cmd.aliases.join(', ') : 'None'}`,
                `Cooldown: ${cmd.cooldown || 0}s`,
                `Permissions: ${cmd.permissions?.join(', ') || 'Everyone'}`,
                cmd.ownerOnly ? 'Owner Only: Yes' : null,
                cmd.adminOnly ? 'Admin Only: Yes' : null,
                cmd.groupOnly ? 'Group Only: Yes' : null,
                cmd.premium ? 'Premium: Yes' : null
            ].filter(Boolean);

            return await sock.sendMessage(from, {
                text: lines.join('\n')
            }, { quoted: message });
        }

        const categories = getAllCategories().sort();
        const allCmds = getAllCommands();

        const categoryEmojis = {
            general: '📱 GENERAL',
            admin: '🛡️ ADMIN',
            ai: '🤖 AI',
            downloader: '📥 DOWNLOADER',
            economy: '💰 ECONOMY',
            fun: '🎭 FUN',
            games: '🎮 GAMES',
            media: '🎨 MEDIA',
            owner: '👑 OWNER',
            utility: '🔧 UTILITY'
        };

        const name = pushName || 'User';
        let text = `${config.botName}\n`;
        text += `Hey ${name}! Here are all ${allCmds.length} commands:\n\n`;

        for (const cat of categories) {
            if (cat === 'owner' && !isOwner && !isSudo) continue;
            const cmds = getCommandsByCategory(cat).filter(c => !c.hidden);
            if (!cmds.length) continue;
            const label = categoryEmojis[cat.toLowerCase()] || cat.toUpperCase();
            text += `[ ${label} ]\n`;
            text += cmds.map(c => `${prefix}${c.name}`).join('  ');
            text += '\n\n';
        }

        text += `Type ${prefix}help [command] for details on any command`;

        await sock.sendMessage(from, { text }, { quoted: message });
    }
};
