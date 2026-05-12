import axios from 'axios';
export default {
    name: 'cartoonify', aliases: [], category: 'fun',
    description: 'cartoonify command', usage: 'cartoonify', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://api.itsrose.life/image/cartoonify', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '🖼️ *Cartoonified!*' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
