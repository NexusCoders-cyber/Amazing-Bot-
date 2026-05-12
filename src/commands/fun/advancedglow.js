import axios from 'axios';
export default {
    name: 'advancedglow', aliases: [], category: 'fun',
    description: 'Advanced glow text effect', usage: 'advancedglow <text>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .advancedglow <text>' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '🎨', key: message.key } });
        try {
            const { data } = await axios.get(`https://apis.prexzyvilla.site/advancedglow?text=${encodeURIComponent(text)}`, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '✨ Advanced glow text effect: ' + text }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
