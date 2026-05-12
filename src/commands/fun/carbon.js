import axios from 'axios';
export default {
    name: 'carbon', aliases: ['codesnap'], category: 'fun',
    description: 'Generate a beautiful code screenshot', usage: 'carbon <code>',
    cooldown: 10,
    async execute({ sock, message, args, from }) {
        const code = args.join(' ').trim();
        if (!code) return sock.sendMessage(from, { text: '❌ Usage: .carbon <code>' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '🎨', key: message.key } });
        try {
            const { data } = await axios.post('https://carbonara.solopov.dev/api/cook', { code, language: 'javascript', theme: 'seti' }, { responseType: 'arraybuffer', timeout: 30000 });
            await sock.sendMessage(from, { image: Buffer.from(data), caption: '💻 Carbon code screenshot' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed. Try again.' }, { quoted: message }); }
    }
};
