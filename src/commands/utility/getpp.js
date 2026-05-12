export default {
    name: 'getpp',
    aliases: ['pp', 'profilepic'],
    category: 'utility',
    description: 'Fetch profile picture of mentioned/replied user',
    usage: 'getpp @user or reply with getpp',
    cooldown: 3,

    async execute({ sock, message, args, from, sender }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo || {};
        const mentioned = ctx.mentionedJid?.[0];
        const participant = ctx.participant;

        let targetJid = mentioned || participant || sender;
        if (!String(targetJid).includes('@')) {
            const num = String(targetJid).replace(/[^0-9]/g, '');
            targetJid = `${num}@s.whatsapp.net`;
        }

        try {
            const pp = await sock.profilePictureUrl(targetJid, 'image');
            await sock.sendMessage(from, {
                image: { url: pp },
                caption: `✅ Profile picture for @${targetJid.split('@')[0]}`,
                mentions: [targetJid]
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Could not fetch profile picture.' }, { quoted: message });
        }
    }
};
