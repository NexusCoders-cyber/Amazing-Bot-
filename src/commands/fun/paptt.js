import axios from 'axios';
export default {
    name: 'paptt', aliases: [], category: 'fun',
    description: 'paptt command', usage: 'paptt', cooldown: 5,
    async execute({ sock, message, from }) {
        try {
            const { data } = await axios.get('https://telegra.ph/file/5c62d66881100db561c9f.mp4', { timeout: 15000 });
            const t = typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data).slice(0, 2000);
            await sock.sendMessage(from, { text: '📄 ' + t }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
