import axios from 'axios';
export default {
    name: 'profile-pictures', aliases: [], category: 'fun',
    description: 'profile-pictures command', usage: 'profile-pictures', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/profilepictures', { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: 'profile-pictures' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
