import axios from 'axios';
export default {
    name: 'hijab-girl', aliases: [], category: 'fun',
    description: 'hijab-girl command', usage: 'hijab-girl', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/hijabgirl', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'hijab-girl' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
