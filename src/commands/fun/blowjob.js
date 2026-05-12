import axios from 'axios';

export default {
    name: 'blowjob',
    aliases: ['nsfwgif', 'bjob'],
    category: 'fun',
    description: 'Fetch random NSFW media from waifu.pics API proxy',
    usage: 'blowjob',
    cooldown: 5,

    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://arychauhann.onrender.com/api/blowjob', { timeout: 60000 });
            const url = data?.url || data?.result?.url || data?.data?.url || data?.gif || data?.video;
            if (!url) throw new Error('No GIF URL returned');
            return await sock.sendMessage(from, {
                video: { url },
                gifPlayback: true,
                caption: '🔞 NSFW GIF'
            }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ blowjob failed: ${error.message}` }, { quoted: message });
        }
    }
};
