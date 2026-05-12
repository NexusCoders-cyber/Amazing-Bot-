function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGroupJid(jid = '') {
    return String(jid).endsWith('@g.us');
}

export default {
    name: 'inviteall',
    aliases: ['dminvite', 'suggestjoin'],
    category: 'admin',
    description: 'Privately send this group invite link to members (opt-in friendly)',
    usage: 'inviteall [limit]',
    cooldown: 60,
    permissions: ['admin'],
    args: false,
    groupOnly: true,

    async execute({ sock, message, from, sender, args, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            if (!isGroupJid(from)) {
                return await sock.sendMessage(from, { text: '❌ This command only works in groups.' }, { quoted: message });
            }

            if (!isGroupAdmin) {
                return await sock.sendMessage(from, { text: '❌ Group admin only.' }, { quoted: message });
            }

            if (!isBotAdmin) {
                return await sock.sendMessage(from, { text: '❌ Bot must be admin to fetch invite link.' }, { quoted: message });
            }

            const rawLimit = parseInt(args?.[0] || '20', 10);
            const limit = Number.isNaN(rawLimit) ? 20 : Math.max(1, Math.min(100, rawLimit));

            const [metadata, code] = await Promise.all([
                sock.groupMetadata(from),
                sock.groupInviteCode(from)
            ]);

            const inviteLink = `https://chat.whatsapp.com/${code}`;
            const participants = metadata?.participants || [];
            const botJid = sock?.user?.id?.split(':')[0] || '';

            const candidates = participants
                .map((p) => p.id)
                .filter((jid) => String(jid).endsWith('@s.whatsapp.net'))
                .filter((jid) => String(jid).split(':')[0] !== String(botJid).split(':')[0])
                .filter((jid) => String(jid).split(':')[0] !== String(sender).split(':')[0])
                .slice(0, limit);

            if (!candidates.length) {
                return await sock.sendMessage(from, { text: '⚠️ No eligible members to message.' }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `📨 Sending private invite messages to up to ${candidates.length} members...\n\nUse: ${prefix}inviteall <limit> (max 100)`
            }, { quoted: message });

            let sent = 0;
            for (const member of candidates) {
                try {
                    await sock.sendMessage(member, {
                        text: [
                            '👋 Hello!',
                            `You are invited to join/rejoin: *${metadata.subject || 'our group'}*`,
                            '',
                            `🔗 ${inviteLink}`,
                            '',
                            'This is an optional invite message from a group admin.'
                        ].join('\n')
                    });
                    sent += 1;
                    await sleep(1200 + Math.floor(Math.random() * 1200));
                } catch {
                    // skip failed DM (privacy settings, blocked, etc)
                }
            }

            await sock.sendMessage(from, {
                text: `✅ Invite DM completed.\n• Attempted: ${candidates.length}\n• Sent: ${sent}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ inviteall failed: ${error.message}`
            }, { quoted: message });
        }
    }
};
