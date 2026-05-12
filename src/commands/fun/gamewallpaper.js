import axios from 'axios';
export default {
    name: 'gamewallpaper', aliases: [], category: 'fun',
    description: 'gamewallpaper command', usage: 'gamewallpaper', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/anime/gamewallpaper', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'gamewallpaper' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
