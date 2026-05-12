import axios from 'axios';
export default {
    name: 'panda', aliases: [], category: 'fun',
    description: 'panda command', usage: 'panda', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://some-random-api.ml/img/panda', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '🐼 Random Panda!' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
