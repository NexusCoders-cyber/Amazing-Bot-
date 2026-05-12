import axios from 'axios';
export default {
    name: 'movie', aliases: [], category: 'fun',
    description: 'movie command', usage: 'movie', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://i.ibb.co/4f4tTnG/no-poster.png', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'movie' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
