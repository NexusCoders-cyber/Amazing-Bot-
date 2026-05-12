import axios from 'axios';
export default {
    name: 'cbhcchhcx', aliases: [], category: 'fun',
    description: 'cbhcchhcx command', usage: 'cbhcchhcx', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://type.fit/api/quotes', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
