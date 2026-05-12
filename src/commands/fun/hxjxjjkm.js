import axios from 'axios';
export default {
    name: 'hxjxjjkm', aliases: [], category: 'fun',
    description: 'hxjxjjkm command', usage: 'hxjxjjkm', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://some-random-api.ml/img/birb', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '🐦 Random Bird!' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
