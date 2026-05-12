import axios from 'axios';
export default {
    name: 'fox', aliases: [], category: 'fun',
    description: 'fox command', usage: 'fox', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://randomfox.ca/floof/', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '🦊 Random Fox!' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
