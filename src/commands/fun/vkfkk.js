import axios from 'axios';
export default {
    name: 'vkfkk', aliases: [], category: 'fun',
    description: 'vkfkk command', usage: 'vkfkk', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://api.quotable.io/random', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
