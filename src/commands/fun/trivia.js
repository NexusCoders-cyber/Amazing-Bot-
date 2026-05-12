import axios from 'axios';
export default {
    name: 'trivia', aliases: [], category: 'fun',
    description: 'trivia command', usage: 'trivia', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
