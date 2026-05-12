import axios from 'axios';
export default {
    name: 'getpp', aliases: [], category: 'fun',
    description: 'getpp command', usage: 'getpp', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png?q=60', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'getpp' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
