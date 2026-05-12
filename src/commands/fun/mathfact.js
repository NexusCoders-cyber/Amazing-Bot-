import axios from 'axios';
export default {
    name: 'mathfact', aliases: [], category: 'fun',
    description: 'mathfact command', usage: 'mathfact', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('http://numbersapi.com/random/math?json', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
