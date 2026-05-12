import axios from 'axios';
export default {
    name: 'cosplaysagiri', aliases: [], category: 'fun',
    description: 'cosplaysagiri command', usage: 'cosplaysagiri', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/cosplaysagiri', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'cosplaysagiri' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
