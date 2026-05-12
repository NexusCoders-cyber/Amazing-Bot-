import axios from 'axios';
export default {
    name: 'bchcn', aliases: [], category: 'fun',
    description: 'bchcn command', usage: 'bchcn', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://some-random-api.ml/img/koala', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '🐨 Random Koala!' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
