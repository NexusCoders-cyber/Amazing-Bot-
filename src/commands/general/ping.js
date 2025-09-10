module.exports = {
    name: 'ping',
    aliases: ['p', 'latency'],
    category: 'general',
    description: 'Check bot response time and server latency',
    usage: 'ping',
    example: 'ping',
    cooldown: 3,
    permissions: [],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        const startTime = Date.now();
        
        const pingMessage = await sock.sendMessage(from, {
            text: '🏓 Pinging...'
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const uptime = process.uptime();
        
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const uptimeString = `${hours}h ${minutes}m ${seconds}s`;
        
        const memoryUsage = process.memoryUsage();
        const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        
        const responseText = `🏓 *Pong!*

📊 *Performance Stats:*
├ Response Time: ${responseTime}ms
├ Uptime: ${uptimeString}
├ Memory Usage: ${memoryMB} MB
├ Platform: ${process.platform}
├ Node.js: ${process.version}
╰ Status: Online ✅

💻 *Bot Info:*
├ Name: ${require('../../config').botName}
├ Version: ${require('../../constants').BOT_VERSION}
├ Creator: ${require('../../constants').BOT_AUTHOR}
╰ Mode: ${isGroup ? 'Group' : 'Private'}

_🧠 Amazing Bot 🧠 v1 created by Ilom_`;

        await sock.sendMessage(from, {
            text: responseText,
            edit: pingMessage.key
        });
    }
};