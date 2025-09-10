const config = require('../../config');
const os = require('os');

module.exports = {
    name: 'info',
    aliases: ['about', 'botinfo'],
    category: 'general',
    description: 'Display detailed bot information',
    usage: 'info',
    cooldown: 5,
    permissions: ['user'],

    async execute(sock, message) {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        
        const memoryUsage = process.memoryUsage();
        const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        
        const infoText = `╭─「 *BOT INFORMATION* 」
│ 🤖 *Name:* ${config.botName}
│ 📱 *Version:* ${config.botVersion || '1.0.0'}
│ 👨‍💻 *Developer:* Ilom
│ 🌐 *Website:* ${config.website || 'https://ilom.tech'}
│ 
│ ⚙️ *SYSTEM INFO:*
│ 🕐 *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s
│ 💾 *Memory:* ${usedMemory}MB / ${totalMemory}GB
│ 🖥️ *Platform:* ${os.platform()}
│ 📡 *Node.js:* ${process.version}
│ 
│ 🔧 *FEATURES:*
│ • AI Chat Integration
│ • Media Processing
│ • Download Services
│ • Economy System
│ • Admin Tools
│ • Group Management
│ 
│ 📞 *SUPPORT:*
│ • Owner: ${config.ownerNumbers?.[0] || 'Not set'}
│ • Repository: ${config.repository || 'Private'}
╰────────────────

✨ *Thank you for using ${config.botName}!*`;

        await sock.sendMessage(message.key.remoteJid, { text: infoText });
    }
};