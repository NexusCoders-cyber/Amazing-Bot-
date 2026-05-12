import axios from 'axios';

function delay(ms = 1700) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'mg',
    aliases: ['manga'],
    category: 'utility',
    description: 'Generate manga style image',
    usage: 'mg <prompt>',
    minArgs: 1,
    async execute({ sock, message, from, args }) {
        const prompt = args.join(' ').trim();
        await sock.sendMessage(from, { text: '⏳ Creating manga image...' }, { quoted: message });
        await delay(2000);
        const { data } = await axios.get('https://arychauhann.onrender.com/api/manga', { params: { prompt }, timeout: 120000 });
        const url = data?.url || data?.result || data?.image || data?.data?.url;
        if (!url) throw new Error('No image URL returned');
        await sock.sendMessage(from, { image: { url }, caption: `📚 Manga Gen
Prompt: ${prompt}` }, { quoted: message });
    }
};
