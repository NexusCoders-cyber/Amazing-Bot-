function normalizeInput(raw = '') {
    return String(raw).replace(/[^0-9]/g, '');
}

export default {
    name: 'getinfo',
    aliases: ['wainfo', 'numinfo'],
    category: 'utility',
    description: 'Get WhatsApp number information',
    usage: 'getinfo <number> or reply/mention user',
    cooldown: 3,

    async execute({ sock, message, args, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo || {};
        const mentioned = ctx.mentionedJid?.[0] || '';
        const participant = ctx.participant || '';
        const first = args[0] || mentioned || participant || '';
        const digits = first.includes('@') ? first.split('@')[0].replace(/[^0-9]/g, '') : normalizeInput(first);

        if (!digits) {
            return sock.sendMessage(from, { text: '❌ Usage: getinfo <number> or mention/reply user.' }, { quoted: message });
        }

        const jid = `${digits}@s.whatsapp.net`;
        const [result] = await sock.onWhatsApp(jid).catch(() => []);
        if (!result?.exists) {
            return sock.sendMessage(from, { text: `❌ +${digits} is not on WhatsApp.` }, { quoted: message });
        }

        let status = 'Unavailable';
        let setAt = 'Unknown';
        let pic = null;
        try {
            const st = await sock.fetchStatus(result.jid);
            status = st?.status || status;
            setAt = st?.setAt ? new Date(st.setAt).toLocaleString() : setAt;
        } catch {}
        try { pic = await sock.profilePictureUrl(result.jid, 'image'); } catch {}

        const text = [
            '📌 *WhatsApp Number Info*',
            `Number: +${digits}`,
            `JID: ${result.jid}`,
            `Exists: Yes`,
            `Business: ${result.biz ? 'Yes' : 'No'}`,
            `Status: ${status}`,
            `Status Updated: ${setAt}`
        ].join('\n');

        if (pic) {
            return sock.sendMessage(from, { image: { url: pic }, caption: text, mentions: [result.jid] }, { quoted: message });
        }

        return sock.sendMessage(from, { text, mentions: [result.jid] }, { quoted: message });
    }
};
