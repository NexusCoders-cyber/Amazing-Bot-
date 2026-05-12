import axios from 'axios';
export default {
    name: 'qc', aliases: [], category: 'fun',
    description: 'qc command', usage: 'qc', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://telegra.ph/file/6880771c1f1b5954d7203.jpg', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
