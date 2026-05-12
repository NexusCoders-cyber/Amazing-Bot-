import axios from 'axios';
export default {
    name: 'prog', aliases: [], category: 'fun',
    description: 'prog command', usage: 'prog', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://v2.jokeapi.dev/joke/Programming?type=single', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
