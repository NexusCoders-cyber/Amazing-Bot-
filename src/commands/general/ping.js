export default {
    name: 'ping',
    aliases: ['p', 'speed', 'latency'],
    category: 'general',
    description: 'Check bot response speed',
    usage: 'ping',
    example: 'ping',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    minArgs: 0,

    async execute({ sock, message, from }) {
        const start = Date.now();
        const sent = await sock.sendMessage(from, { text: 'Pinging...' }, { quoted: message });
        const latency = Date.now() - start;

        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

        const memUsage = process.memoryUsage();
        const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);

        await sock.sendMessage(from, {
            text: `Pong!\n\nLatency: ${latency}ms\nUptime: ${uptimeStr}\nMemory: ${memMB}MB`,
            edit: sent.key
        });
    }
};
