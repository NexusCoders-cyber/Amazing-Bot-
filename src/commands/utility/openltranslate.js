import axios from 'axios';

function delay(ms = 1700) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'openltranslate',
    aliases: ['openl', 'olt'],
    category: 'utility',
    description: 'Translate text from image URL using OpenL',
    usage: 'openltranslate <image-url>',
    minArgs: 1,
    async execute({ sock, message, from, args }) {
        const url = args[0];
        await sock.sendMessage(from, { text: '⏳ Translating image text...' }, { quoted: message });
        await delay(2200);
        const { data } = await axios.get('https://arychauhann.onrender.com/api/openltranslate', { params: { url }, timeout: 120000 });
        const text = data?.translation || data?.text || data?.result || JSON.stringify(data).slice(0, 2500);
        await sock.sendMessage(from, { text: `📝 OpenL Translate

${text}` }, { quoted: message });
    }
};
