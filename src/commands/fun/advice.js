import axios from 'axios';
export default {
    name: 'advice', aliases: [], category: 'fun',
    description: 'Get a random piece of advice', usage: 'advice', cooldown: 3,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://api.adviceslip.com/advice', { timeout: 10000 });
            await sock.sendMessage(from, { text: `💡 *Advice:* ${data.slip?.advice || 'Be yourself!'}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '💡 Always backup your data!' }, { quoted: message }); }
    }
};
