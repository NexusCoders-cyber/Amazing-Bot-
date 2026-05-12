import axios from 'axios';
export default {
    name: 'tiktokgirl', aliases: [], category: 'fun',
    description: 'tiktokgirl command', usage: 'tiktokgirl', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/tiktok-girl', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'tiktokgirl' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
