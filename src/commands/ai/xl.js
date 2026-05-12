import axios from 'axios';

export default {
    name: 'xl',
    aliases: ['xlai', 'xlimage'],
    category: 'ai',
    description: 'Generate image via XL API and send image result',
    usage: 'xl <prompt>',
    cooldown: 6,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        try {
            const prompt = args.join(' ').trim();
            if (!prompt) return await sock.sendMessage(from, { text: '❌ Usage: xl <prompt>' }, { quoted: message });
            const { data } = await axios.get('https://arychauhann.onrender.com/api/xl', {
                params: { prompt },
                timeout: 120000
            });
            const imageUrl = data?.url || data?.result?.url || data?.result || data?.data?.url;
            if (!imageUrl) throw new Error('No image URL returned');
            return await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption: `🖼️ XL Generated\nPrompt: ${prompt}`
            }, { quoted: message });
        } catch (error) {
            return await sock.sendMessage(from, { text: `❌ xl failed: ${error.message}` }, { quoted: message });
        }
    }
};
