const config = require('../../config');

module.exports = {
    name: 'help',
    aliases: ['h', 'menu', 'commands'],
    category: 'general',
    description: 'Display bot commands and features',
    usage: 'help [command]',
    cooldown: 3,
    permissions: ['user'],

    async execute(sock, message, args, { commandManager }) {
        const prefix = config.prefix;
        
        if (args.length > 0) {
            const commandName = args[0].toLowerCase();
            const command = commandManager.getCommand(commandName);
            
            if (!command) {
                return sock.sendMessage(message.key.remoteJid, {
                    text: `❌ Command "${commandName}" not found.`
                });
            }
            
            const helpText = `╭─「 *${command.name.toUpperCase()}* 」
│ 📝 *Description:* ${command.description}
│ 🏷️ *Category:* ${command.category}
│ 📖 *Usage:* ${prefix}${command.usage}
│ ⏱️ *Cooldown:* ${command.cooldown}s
│ 👥 *Permissions:* ${command.permissions.join(', ')}
${command.aliases ? `│ 🔗 *Aliases:* ${command.aliases.join(', ')}` : ''}
╰────────────────`;
            
            return sock.sendMessage(message.key.remoteJid, { text: helpText });
        }
        
        const categories = commandManager.getAllCategories();
        const totalCommands = commandManager.getAllCommands().length;
        
        let helpText = `╭─「 *${config.botName} HELP MENU* 」
│ 🤖 *Bot Version:* ${config.botVersion}
│ 📊 *Total Commands:* ${totalCommands}
│ 🔧 *Prefix:* ${prefix}
│ 
│ 📚 *CATEGORIES:*\n`;

        for (const category of categories) {
            const commands = commandManager.getCommandsByCategory(category);
            helpText += `│ • ${category.toUpperCase()}: ${commands.length} commands\n`;
        }
        
        helpText += `│ 
│ 💡 *Usage:* ${prefix}help [command] for details
│ 🌐 *Support:* ${config.supportGroup || 'Contact owner'}
╰────────────────

*🚀 QUICK COMMANDS:*
• ${prefix}ping - Check bot latency
• ${prefix}info - Bot information
• ${prefix}owner - Contact owner
• ${prefix}status - Bot status`;

        await sock.sendMessage(message.key.remoteJid, { text: helpText });
    }
};