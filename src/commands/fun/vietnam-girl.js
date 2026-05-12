import axios from 'axios';
export default {
    name: 'vietnam-girl', aliases: [], category: 'fun',
    description: 'vietnam-girl command', usage: 'vietnam-girl', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/vietnamgirl', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'vietnam-girl' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
