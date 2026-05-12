import axios from 'axios';
export default {
    name: 'ayuzawa', aliases: [], category: 'fun',
    description: 'ayuzawa command', usage: 'ayuzawa', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/ayuzawa', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'ayuzawa' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
