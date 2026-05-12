import axios from 'axios';
export default {
    name: 'readqr', aliases: [], category: 'fun',
    description: 'readqr command', usage: 'readqr', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://api.qrserver.com/v1/read-qr-code/', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
