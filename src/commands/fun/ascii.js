import axios from 'axios';
export default {
    name: 'ascii', aliases: ['asciiart'], category: 'fun',
    description: 'Generate ASCII art from text', usage: 'ascii <text>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .ascii <text>' }, { quoted: message });
        try {
            const { data } = await axios.get(`https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}`, { timeout: 10000 });
            await sock.sendMessage(from, { text: '```' + data.slice(0, 4000) + '```' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
