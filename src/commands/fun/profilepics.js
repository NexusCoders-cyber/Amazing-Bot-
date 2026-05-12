import axios from 'axios';

export default {
    name: 'profilepics',
    category: 'fun',
    description: 'Fetch random profilepics media',
    usage: 'profilepics',
    cooldown: 4,

    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://apis.prexzyvilla.site/random/profilepics', { timeout: 25000 });
            const payload = data?.result || data?.data || data;
            const url = payload?.url || payload?.image || payload?.link || payload?.result;
            if (!url) throw new Error('No media URL returned');
            return await sock.sendMessage(from, { image: { url }, caption: '✨ profilepics' }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ profilepics failed: ${error.message}` }, { quoted: message });
        }
    }
};
