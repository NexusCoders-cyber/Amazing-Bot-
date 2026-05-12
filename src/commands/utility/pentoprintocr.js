import axios from 'axios';

function delay(ms = 1700) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export default {
    name: 'pentoprintocr',
    aliases: ['pocr'],
    category: 'utility',
    description: 'Extract printed text from image URL (PentoPrintOCR)',
    usage: 'pentoprintocr <image-url>',
    minArgs: 1,
    async execute({ sock, message, from, args }) {
        const url = args[0];
        await sock.sendMessage(from, { text: '⏳ Running OCR...' }, { quoted: message });
        await delay(2600);
        const { data } = await axios.get('https://arychauhann.onrender.com/api/pentoprintocr', { params: { url }, timeout: 120000 });
        const text = data?.ocr || data?.text || data?.result || JSON.stringify(data).slice(0, 2500);
        await sock.sendMessage(from, { text: `📄 OCR Result

${text}` }, { quoted: message });
    }
};
