export default {
    name: 'stats',
    aliases: ['botinfo','info'],
    category: 'owner',
    description: 'Show bot statistics and health',
    usage: 'stats',
    example: 'stats',
    cooldown: 10,
    permissions: ['owner'],
    args: false,
    ownerOnly: true,

    async execute({ sock, message, from }) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const mem = process.memoryUsage();
        const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
        const rssMB = Math.round(mem.rss / 1024 / 1024);

        let commandStats = { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 };
        let topCmds = [];
        try {
            const { commandHandler } = await import('../../../handlers/commandHandler.js');
            commandStats = commandHandler.getCommandStats();
            topCmds = commandHandler.getTopCommands(5);
        } catch {}

        let totalCmds = 0;
        try {
            const { getAllCommands } = await import('../../../utils/commandManager.js');
            totalCmds = getAllCommands().length;
        } catch {}

        let mongoStatus = 'Unknown';
        try {
            const mongoose = (await import('mongoose')).default;
            const states = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
            mongoStatus = states[mongoose.connection.readyState] || 'Unknown';
        } catch { mongoStatus = 'Not loaded'; }

        let groupCount = 0;
        try {
            const groups = await sock.groupFetchAllParticipating();
            groupCount = Object.keys(groups).length;
        } catch {}

        const successRate = commandStats.totalExecutions > 0
            ? ((commandStats.successfulExecutions / commandStats.totalExecutions) * 100).toFixed(1)
            : '0';

        let text = `Bot Statistics\n\n`;
        text += `Uptime: ${hours}h ${minutes}m ${seconds}s\n`;
        text += `Memory: ${heapMB}MB / ${heapTotalMB}MB (RSS: ${rssMB}MB)\n`;
        text += `Platform: ${process.platform} | Node: ${process.version}\n\n`;
        text += `Database: ${mongoStatus}\n`;
        text += `Groups: ${groupCount}\n`;
        text += `Commands: ${totalCmds}\n\n`;
        text += `Commands Executed: ${commandStats.totalExecutions}\n`;
        text += `Success Rate: ${successRate}%\n`;
        text += `Failed: ${commandStats.failedExecutions}\n`;

        if (topCmds.length > 0) {
            text += `\nTop Commands:\n`;
            topCmds.forEach((c, i) => {
                text += `${i + 1}. ${c.name} (${c.used} uses, ${c.successRate}% success)\n`;
            });
        }

        await sock.sendMessage(from, { text }, { quoted: message });
    }
};
