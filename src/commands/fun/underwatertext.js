import axios from 'axios';
export default {
    name: 'underwatertext', aliases: [], category: 'fun',
    description: 'Underwater text effect', usage: 'underwatertext <text>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .underwatertext <text>' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '🎨', key: message.key } });
        try {
            const { data } = await axios.get(`https://apis.prexzyvilla.site/underwatertext?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '✨ Underwater text effect: ' + text }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
