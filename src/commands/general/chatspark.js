export default {
    name: 'chatspark',
    aliases: ['spark'],
    category: 'general',
    description: 'Chat with Spark AI (tags hidden)',
    usage: 'chatspark <message>',
    cooldown: 5,

    async execute({ sock, message, args, from, sender }) {
        const text = args.join(' ').trim();
        if (!text) return sock.sendMessage(from, { text: '❌ Usage: .chatspark <message>' }, { quoted: message });

        await sock.sendMessage(from, { react: { text: '💬', key: message.key } });

        try {
            const { default: axios } = await import('axios');
            const { data } = await axios.get(`https://api.davidcyril.name.ng/chatspark?text=${encodeURIComponent(text)}`, { timeout: 15000 });
            const reply = data?.response || data?.message || data?.reply || JSON.stringify(data);
            await sock.sendMessage(from, { text: `💬 *Spark:* ${reply}` }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Spark is unavailable right now.' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    }
};
