import axios from 'axios';
export default {
    name: 'mountain', aliases: [], category: 'fun',
    description: 'mountain command', usage: 'mountain', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/mountain', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'mountain' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
