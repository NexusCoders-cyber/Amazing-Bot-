import axios from 'axios';
export default {
    name: 'newmail', aliases: [], category: 'fun',
    description: 'newmail command', usage: 'newmail', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
