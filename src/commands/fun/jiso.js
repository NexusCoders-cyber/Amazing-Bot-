import axios from 'axios';
export default {
    name: 'jiso', aliases: [], category: 'fun',
    description: 'jiso command', usage: 'jiso', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/jiso', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'jiso' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
