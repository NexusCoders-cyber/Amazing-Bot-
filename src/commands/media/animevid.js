import axios from 'axios';
import config from '../../config.js';

export default {
    name: 'animevid',
    aliases: ['animevideo', 'av', 'randomanime'],
    category: 'media',
    description: 'Send a random anime video',
    usage: 'animevid',
    example: 'animevid',
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

    async execute(options) {
        const {
            sock,
            message,
            from,
            sender,
            prefix
        } = options;

        try {
            // React to user's message
            await sock.sendMessage(from, {
                react: { text: '🎌', key: message.key }
            });

            // Send processing message
            const statusMsg = await sock.sendMessage(from, {
                text: '⏳ Fetching random anime video...'
            }, { quoted: message });

            // API call - assuming returns JSON with 'videoUrl'
            const apiUrl = `https://arychauhann.onrender.com/api/animevideo`;
            const { data } = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            // Assume response has videoUrl
            const videoUrl = data.videoUrl || data.url || null;
            if (!videoUrl) {
                throw new Error('No video URL returned from API');
            }

            // Download video buffer
            const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
            const videoBuffer = Buffer.from(videoRes.data);

            // Send video
            await sock.sendMessage(from, {
                video: videoBuffer,
                mimetype: 'video/mp4',
                caption: 'Random Anime Video! 🎌'
            }, { quoted: message });

            // Edit status to done
            await sock.sendMessage(from, {
                text: '✅ Video sent!',
                edit: statusMsg.key
            }, { quoted: message });

            // Success react
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Animevid command error:', error);

            const errorMsg = error.code === 'ECONNABORTED'
                ? 'Request timeout - Try again later'
                : error.response?.status === 429
                ? 'Rate limit exceeded - try again in a moment'
                : error.message || 'Unknown error occurred';

            await sock.sendMessage(from, {
                text: `Failed to fetch anime video\n\nError: ${errorMsg}\nTry again in a moment`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};