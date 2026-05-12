import axios from 'axios';
export default {
    name: 'malaysia-girl', aliases: [], category: 'fun',
    description: 'malaysia-girl command', usage: 'malaysia-girl', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/malaysiagirl', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'malaysia-girl' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
