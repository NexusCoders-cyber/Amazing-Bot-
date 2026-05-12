import axios from 'axios';
export default {
    name: 'meme', aliases: [], category: 'fun',
    description: 'meme command', usage: 'meme', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://meme-api.com/gimme', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '😂 ${meme.title}' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
