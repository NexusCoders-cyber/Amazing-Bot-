import axios from 'axios';
export default {
    name: 'shortquote', aliases: [], category: 'fun',
    description: 'shortquote command', usage: 'shortquote', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/shortquote', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'shortquote' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
