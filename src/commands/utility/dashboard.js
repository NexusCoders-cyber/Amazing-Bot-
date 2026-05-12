import { getTopCommands, getSystemStats } from '../../utils/commandManager.js';

function timeAgo(t) {
    if (!t) return 'Never';
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} day(s) ago`;
}

export default {
    name: 'dashboard',
    aliases: ['statsboard', 'usage'],
    category: 'utility',
    description: 'Advanced command usage dashboard',
    usage: 'dashboard',
    cooldown: 10,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        try {
            const top = getTopCommands(20);
            const stats = getSystemStats();

            if (!top.length) {
                return await sock.sendMessage(from, { text: '⚠️ No stats yet. Use some commands first.' }, { quoted: message });
            }

            let text = `╭━━━〔 📊 *DASHBOARD* 〕━━━╮\n`;
            text += `┃ 👑 Top: *${top[0]?.name || 'None'}*\n`;
            text += `┃ 🔥 Commands: ${stats.totalCommands}\n`;
            text += `┃ ▶️ Total Runs: ${stats.totalUsage}\n`;
            text += `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            top.slice(0, 15).forEach((cmd, i) => {
                const success = cmd.used > 0 ? (((cmd.used - cmd.errors) / cmd.used) * 100).toFixed(1) : '0.0';
                text += `*${i + 1}.* ${cmd.name}${i === 0 ? ' 👑' : ''}\n`;
                text += `   ⚡ ${cmd.used} | ❌ ${cmd.errors} | 📈 ${success}%\n`;
                text += `   🕒 ${timeAgo(cmd.lastUsed)}\n\n`;
            });

            await sock.sendMessage(from, { text: text.slice(0, 3900) }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(from, { text: `❌ Dashboard crashed:\n${err.message}` }, { quoted: message });
        }
    }
};
