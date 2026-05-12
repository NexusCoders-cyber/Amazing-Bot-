import axios from 'axios';
export default {
    name: 'kopi', aliases: [], category: 'fun',
    description: 'kopi command', usage: 'kopi', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://coffee.alexflipnote.dev/random', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'kopi' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
