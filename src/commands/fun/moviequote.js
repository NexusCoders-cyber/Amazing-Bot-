import axios from 'axios';
export default {
    name: 'moviequote', aliases: [], category: 'fun',
    description: 'moviequote command', usage: 'moviequote', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://movie-quote-api.herokuapp.com/v1/quote/', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
