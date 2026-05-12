import axios from 'axios';
export default {
    name: 'coffee', aliases: [], category: 'fun',
    description: 'coffee command', usage: 'coffee', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://coffee.alexflipnote.dev/random', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'coffee' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
