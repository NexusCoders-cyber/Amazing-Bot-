const config = require('../../config');

module.exports = {
    name: 'status',
    aliases: ['stat', 'botstat'],
    category: 'general',
    description: 'Check bot status and performance',
    usage: 'status',
    cooldown: 3,
    permissions: ['user'],

    async execute(sock, message, args, { commandManager, databaseManager, cache }) {
        const startTime = Date.now();
        
        await sock.sendMessage(message.key.remoteJid, { text: '🔄 *Checking bot status...*' });
        
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        const responseTime = Date.now() - startTime;
        
        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${days}d ${hours}h ${minutes}m ${secs}s`;
        };
        
        const formatBytes = (bytes) => {
            return (bytes / 1024 / 1024).toFixed(2) + ' MB';
        };
        
        let dbStatus = '❌ Disconnected';
        try {
            if (databaseManager && databaseManager.isConnected) {
                dbStatus = '✅ Connected';
            }
        } catch (error) {
            dbStatus = '⚠️ Error';
        }
        
        let cacheStatus = '❌ Disabled';
        try {
            if (cache && cache.isHealthy) {
                cacheStatus = '✅ Active';
            }
        } catch (error) {
            cacheStatus = '⚠️ Error';
        }
        
        const totalCommands = commandManager ? commandManager.getAllCommands().length : 0;
        
        const statusText = `╭─「 *BOT STATUS* 」
│ 🤖 *Bot:* ${config.botName}
│ 📊 *Status:* ✅ Online
│ ⏱️ *Response Time:* ${responseTime}ms
│ 
│ ⚡ *PERFORMANCE:*
│ 🕐 *Uptime:* ${formatUptime(uptime)}
│ 💾 *Memory Used:* ${formatBytes(memoryUsage.heapUsed)}
│ 📈 *Memory Total:* ${formatBytes(memoryUsage.heapTotal)}
│ 
│ 🔧 *SERVICES:*
│ 🗄️ *Database:* ${dbStatus}
│ 💨 *Cache:* ${cacheStatus}
│ 📱 *WhatsApp:* ✅ Connected
│ 
│ 📊 *STATISTICS:*
│ 🔨 *Commands:* ${totalCommands}
│ 🔧 *Mode:* ${config.publicMode ? 'Public' : 'Private'}
│ 🛡️ *Prefix:* ${config.prefix}
╰────────────────

🎯 *All systems operational!*`;

        await sock.sendMessage(message.key.remoteJid, { text: statusText });
    }
};