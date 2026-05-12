import axios from 'axios';
export default {
    name: 'shizuka', aliases: [], category: 'fun',
    description: 'shizuka command', usage: 'shizuka', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/shizuka', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'shizuka' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
