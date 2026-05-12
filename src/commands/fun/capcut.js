import axios from 'axios';
export default {
    name: 'capcut', aliases: ['cctemplate'], category: 'fun',
    description: 'Download CapCut template', usage: 'capcut <url>', cooldown: 5,
    async execute({ sock, message, args, from }) {
        const url = args.join(' ').trim();
        if (!url) return sock.sendMessage(from, { text: '❌ Usage: .capcut <url>' }, { quoted: message });
        try {
            const { data } = await axios.get(`https://api.davidcyril.name.ng/capcut?url=${encodeURIComponent(url)}`, { timeout: 15000 });
            await sock.sendMessage(from, { text: JSON.stringify(data, null, 2).slice(0, 4000) }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
