export default {
    name: 'demoteall',
    aliases: ['unadminall', 'demoteadmin'],
    category: 'admin',
    description: 'Demote all admins to members (except group owner)',
    usage: 'demoteall',
    cooldown: 10,
    permissions: ['admin'],
    args: false,
    minArgs: 0,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from }) {
        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;

            const admins = participants.filter(p => {
                if (p.admin === 'superadmin') return false; // skip group owner
                if (p.admin !== 'admin') return false;       // only regular admins
                return true;
            });

            if (!admins.length) {
                return await sock.sendMessage(from, {
                    text: '❌ No regular admins to demote.'
                }, { quoted: message });
            }

            const adminIds = admins.map(a => a.id);

            await sock.sendMessage(from, {
                text: `⏳ Demoting ${adminIds.length} admin(s)...`
            }, { quoted: message });

            // Demote in batches of 5 to avoid rate limits
            const batchSize = 5;
            let demoted = 0;

            for (let i = 0; i < adminIds.length; i += batchSize) {
                const batch = adminIds.slice(i, i + batchSize);
                await sock.groupParticipantsUpdate(from, batch, 'demote');
                demoted += batch.length;
            }

            const mentionText = adminIds.map(id => `@${id.split('@')[0]}`).join('\n');

            await sock.sendMessage(from, {
                text: `✅ Successfully demoted *${demoted} admin(s)*\n\n${mentionText}`,
                mentions: adminIds
            }, { quoted: message });

        } catch (error) {
            let msg = '❌ Error: Failed to demote admins\n';
            if (error.message.includes('not-authorized')) {
                msg += 'Bot lacks admin permission.';
            } else {
                msg += error.message;
            }
            await sock.sendMessage(from, { text: msg }, { quoted: message });
        }
    }
};
