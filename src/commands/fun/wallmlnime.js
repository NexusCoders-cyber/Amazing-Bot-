import axios from 'axios';
export default {
    name: 'wallmlnime', aliases: [], category: 'fun',
    description: 'wallmlnime command', usage: 'wallmlnime', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/wallmlnime', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'wallmlnime' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
