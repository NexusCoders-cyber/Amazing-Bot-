import axios from 'axios';

function delay(ms = 1700) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'animagine',
    aliases: ['aniimg'],
    category: 'utility',
    description: 'Generate image with Animagine model',
    usage: 'animagine <prompt>',
    minArgs: 1,
    async execute({ sock, message, from, args }) {
        const prompt = args.join(' ').trim();
        if (!prompt) return sock.sendMessage(from, { text: '❌ Provide prompt.' }, { quoted: message });
        await sock.sendMessage(from, { text: '⏳ Generating image, please wait...' }, { quoted: message });
        await delay(1800);
        const { data } = await axios.get('https://arychauhann.onrender.com/api/animagine', { params: { prompt }, timeout: 120000 });
        const url = data?.url || data?.result || data?.image || data?.data?.url;
        if (!url) throw new Error('No image URL returned');
        await sock.sendMessage(from, { image: { url }, caption: `🎨 Animagine
Prompt: ${prompt}` }, { quoted: message });
    }
};
