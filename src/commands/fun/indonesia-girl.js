import axios from 'axios';
export default {
    name: 'indonesia-girl', aliases: [], category: 'fun',
    description: 'indonesia-girl command', usage: 'indonesia-girl', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/indonesiagirl', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'indonesia-girl' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
