import axios from 'axios';
export default {
    name: 'tempmail-inbox', aliases: ['inbox'], category: 'fun',
    description: 'Check temporary email inbox', usage: 'tempmail-inbox <username>', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const user = args.join(' ').trim();
        if (!user) return sock.sendMessage(from, { text: '❌ Usage: .tempmail-inbox <username>\nUsername from your temp email (part before @)' }, { quoted: message });
        try {
            const { data } = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${user}&domain=1secmail.com`, { timeout: 10000 });
            if (data?.length) {
                let msg = `📬 *Inbox for ${user}@1secmail.com*\n\n`;
                data.slice(0, 5).forEach((m, i) => msg += `${i + 1}. ${m.subject || '(no subject)'}\n   From: ${m.from}\n   ID: ${m.id}\n\n`);
                await sock.sendMessage(from, { text: msg }, { quoted: message });
            } else {
                await sock.sendMessage(from, { text: '📭 No messages yet.' }, { quoted: message });
            }
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
