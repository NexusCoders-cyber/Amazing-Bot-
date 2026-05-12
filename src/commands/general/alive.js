import moment from 'moment';
export default {
    name: 'alive', aliases: ['ping', 'test'], category: 'general',
    description: 'Check if bot is alive and responding', usage: 'alive', cooldown: 2,
    async execute({ sock, message, from }) {
        const uptime = moment.duration(process.uptime(), 'seconds').humanize();
        await sock.sendMessage(from, { text: `🤖 *Bot is Alive!*\n⏱ Uptime: ${uptime}` }, { quoted: message });
    }
};
