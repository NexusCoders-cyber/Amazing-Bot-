export default {
    name: 'hijack',
    aliases: ['takeovergc'],
    category: 'admin',
    description: 'Demote all admins, leave only bot as admin',
    usage: 'hijack',
    cooldown: 12,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            const meta = await sock.groupMetadata(from);
            const botPhone = (sock?.user?.id || '').split(':')[0];
            const botJid = botPhone + '@s.whatsapp.net';

            const allAdmins = meta.participants.filter(p => p.admin);
            const targets = allAdmins.filter(p => p.id !== botJid).map(p => p.id);

            if (!targets.length) {
                return sock.sendMessage(from, { text: '⚠️ No other admins to demote.' }, { quoted: message });
            }

            let demoted = 0;
            let failed = 0;

            for (let i = 0; i < targets.length; i += 5) {
                const chunk = targets.slice(i, i + 5);
                try {
                    await sock.groupParticipantsUpdate(from, chunk, 'demote');
                    demoted += chunk.length;
                } catch {
                    failed += chunk.length;
                }
            }

            await sock.sendMessage(from, {
                text: `✅ *Hijack complete*\n\nDemoted: ${demoted} admins\nFailed: ${failed}\nBot is now the only admin`
            }, { quoted: message });
        } catch (error) {
            return sock.sendMessage(from, { text: `❌ Hijack failed: ${error.message}` }, { quoted: message });
        }
    }
};
