import axios from 'axios';
export default {
    name: 'deidara', aliases: [], category: 'fun',
    description: 'deidara command', usage: 'deidara', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/deidara', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'deidara' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
