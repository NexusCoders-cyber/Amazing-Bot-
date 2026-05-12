import axios from 'axios';
export default {
    name: 'shorten', aliases: ['shr'], category: 'fun',
    description: 'Shorten a URL', usage: 'shorten <url>',
    cooldown: 5,
    async execute({ sock, message, args, from }) {
        const url = args.join(' ').trim();
        if (!url) return sock.sendMessage(from, { text: '❌ Usage: .shorten <url>' }, { quoted: message });
        try {
            const { data } = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 10000 });
            await sock.sendMessage(from, { text: `🔗 *Shortened URL*\n\nOriginal: ${url}\nShort: ${data}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
