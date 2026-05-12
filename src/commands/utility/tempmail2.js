import axios from 'axios';

const mailboxCache = new Map();

function parseMailbox(mailbox) {
    const [login, domain] = String(mailbox || '').split('@');
    return { login, domain };
}

export default {
    name: 'tempmail2',
    aliases: ['newmail', 'readmail', 'deltmp', 'tempmail-inbox'],
    category: 'utility',
    description: 'Temporary mail tools powered by 1secmail',
    usage: 'tempmail2 | readmail | deltmp',
    cooldown: 5,

    async execute({ sock, message, from, sender, prefix }) {
        const body = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';
        const cmd = body.startsWith(prefix) ? body.slice(prefix.length).split(/\s+/)[0].toLowerCase() : 'tempmail2';

        try {
            if (cmd === 'deltmp') {
                mailboxCache.delete(sender);
                return await sock.sendMessage(from, { text: '🗑️ Temp mailbox removed from session.' }, { quoted: message });
            }

            if (cmd === 'readmail' || cmd === 'tempmail-inbox') {
                const mailbox = mailboxCache.get(sender);
                if (!mailbox) {
                    return await sock.sendMessage(from, { text: '❌ No mailbox in session. Use .newmail first.' }, { quoted: message });
                }

                const { login, domain } = parseMailbox(mailbox);
                const { data } = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`, { timeout: 15000 });
                if (!Array.isArray(data) || !data.length) {
                    return await sock.sendMessage(from, { text: `📭 Inbox empty for ${mailbox}` }, { quoted: message });
                }

                const preview = data.slice(0, 10).map((m, i) => `${i + 1}. ${m.from}\n   Subject: ${m.subject || '-'}\n   Date: ${m.date || '-'}`).join('\n');
                return await sock.sendMessage(from, { text: `📬 Inbox for ${mailbox}\n\n${preview}` }, { quoted: message });
            }

            const { data } = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', { timeout: 15000 });
            const mailbox = Array.isArray(data) ? data[0] : null;
            if (!mailbox) throw new Error('Mailbox not returned');
            mailboxCache.set(sender, mailbox);
            await sock.sendMessage(from, { text: `📧 Temp mail: ${mailbox}\nUse .readmail to check inbox.` }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed: ${error.message}` }, { quoted: message });
        }
    }
};
