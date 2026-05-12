import axios from 'axios';
export default {
    name: 'gamefact', aliases: [], category: 'fun',
    description: 'gamefact command', usage: 'gamefact', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://www.freetogame.com/api/games', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
