import axios from 'axios';
export default {
    name: 'neko', aliases: ['animeimg'], category: 'fun',
    description: 'Get a random anime neko image', usage: 'neko', cooldown: 3,
    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { react: { text: '🐱', key: message.key } });
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/neko', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '🐱 Neko!' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
