import axios from 'axios';

export default {
    name: 'anivid',
    aliases: ['anime', 'randomvid'],
    category: 'media',
    description: 'Get a random anime video.',
    usage: 'anivid',
    example: 'anivid',
    cooldown: 10,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from }) {
        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const apiUrl = 'https://arychauhann.onrender.com/api/animevideo';

            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const data = response.data;

            // Assuming API returns { video: 'url', title: '...' } or direct URL
            // Adjust if actual structure differs
            let videoUrl;
            if (typeof data === 'string' && data.startsWith('http')) {
                videoUrl = data;
            } else if (data.video) {
                videoUrl = data.video;
            } else {
                throw new Error('No video URL found in response');
            }

            const caption = `🎌 *Random Anime Video*\n\n` +
                            `✨ Enjoy! ${data.title ? `Title: ${data.title}` : ''}`;

            await sock.sendMessage(from, {
                video: { url: videoUrl },
                caption: caption
            }, { quoted: message });

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (err) {
            console.error('Anivid command error:', err);
            await sock.sendMessage(from, {
                text: `❌ Failed to fetch anime video: ${err.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};