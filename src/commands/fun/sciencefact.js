import axios from 'axios';
export default {
    name: 'sciencefact', aliases: [], category: 'fun',
    description: 'sciencefact command', usage: 'sciencefact', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
