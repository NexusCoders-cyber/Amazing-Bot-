import axios from 'axios';

export default {
    name: 'tempmail', aliases: ['tmpmail', 'tempmail2'], category: 'fun',
    description: 'Get a temporary email address', usage: 'tempmail', cooldown: 10,
    async execute({ sock, message, from }) {
        await sock.sendMessage(from, { react: { text: '📧', key: message.key } });
        try {
            const { data } = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', { timeout: 10000 });
            if (data?.[0]) {
                await sock.sendMessage(from, { text: `📧 *Temporary Email*\n\n${data[0]}\n\nCheck inbox with .tempmail-inbox ${data[0].split('@')[0]}` }, { quoted: message });
            } else throw new Error('No email');
        } catch { await sock.sendMessage(from, { text: '❌ Failed to generate email.' }, { quoted: message }); }
    }
};
