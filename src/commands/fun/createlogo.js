import axios from 'axios';
export default {
    name: 'createlogo', aliases: [], category: 'fun',
    description: 'createlogo command', usage: 'createlogo', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://www.sologo.ai/v1/api/logo/logo_generate', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'createlogo' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
