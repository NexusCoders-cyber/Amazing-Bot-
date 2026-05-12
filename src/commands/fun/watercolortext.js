import axios from 'axios';
export default {
    name: 'watercolortext', aliases: [], category: 'fun',
    description: 'Watercolor text effect', usage: 'watercolortext <text>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .watercolortext <text>' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '🎨', key: message.key } });
        try {
            const { data } = await axios.get(`https://apis.prexzyvilla.site/watercolortext?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '✨ Watercolor text effect: ' + text }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
