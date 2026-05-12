import axios from 'axios';

export default {
    name: 'shorturl',
    aliases: ['shortlink'],
    category: 'utility',
    description: 'Shorten URL with is.gd',
    usage: 'shorturl <url>',
    args: true,
    minArgs: 1,
    cooldown: 5,

    async execute({ sock, message, from, args }) {
        try {
            const longUrl = args.join(' ').trim();
            const { data } = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`, { timeout: 15000 });
            await sock.sendMessage(from, { text: `🔗 ${data}` }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
