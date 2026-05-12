import axios from 'axios';
export default {
    name: 'glitch', aliases: ['glitchtext'], category: 'fun',
    description: 'Generate glitch text effect image', usage: 'glitch <text>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .glitch <text>' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '⚡', key: message.key } });
        try {
            const { data } = await axios.get(`https://apis.prexzyvilla.site/glitchtext?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: `⚡ Glitch: ${text}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
