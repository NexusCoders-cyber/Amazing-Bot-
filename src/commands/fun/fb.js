import axios from 'axios';
export default {
    name: 'fb', aliases: [], category: 'fun',
    description: 'fb command', usage: 'fb', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://www.facebook.com/', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'Ilom Bot' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
