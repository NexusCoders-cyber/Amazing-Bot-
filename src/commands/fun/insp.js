import axios from 'axios';
export default {
    name: 'insp', aliases: ['inspirasi', 'inspiration'], category: 'fun',
    description: 'Get inspiration/quote', usage: 'insp', cooldown: 3,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://api.quotable.io/random', { timeout: 10000 });
            await sock.sendMessage(from, { text: `💡 *${data.content}*\n— ${data.author}` }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '💡 Be the change you wish to see in the world.' }, { quoted: message }); }
    }
};
