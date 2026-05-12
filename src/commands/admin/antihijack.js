import { setAntiHijackConfig, getAntiHijackConfig } from '../../utils/antihijackStore.js';

function normalizeJid(raw = '') {
    return String(raw || '').split(':')[0];
}

export default {
    name: 'antihijack',
    aliases: ['ahijack'],
    category: 'admin',
    description: 'Protects group by demoting all admins except super admin and bot. Removes command caller.',
    usage: 'antihijack <on|off|status|enforce>',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender }) {
        const action = String(args[0] || 'status').toLowerCase();
        if (!['on', 'off', 'status', 'enforce'].includes(action)) {
            return sock.sendMessage(from, { text: '❌ Usage: antihijack <on|off|status|enforce>' }, { quoted: message });
        }

        if (action === 'status') {
            const conf = await getAntiHijackConfig(from);
            return sock.sendMessage(from, {
                text: `🛡️ AntiHijack is *${conf.enabled ? 'ON' : 'OFF'}*\nOwner lock: ${conf.ownerJid || 'not set'}`
            }, { quoted: message });
        }

        if (action === 'enforce') {
            try {
                const meta = await sock.groupMetadata(from);
                const botId = (sock?.user?.id || '').split(':')[0] + '@s.whatsapp.net';
                const conf = await getAntiHijackConfig(from);
                const ownerJid = conf.ownerJid || sender;

                // All current admins
                const admins = meta.participants.filter(p => p.admin).map(p => p.id);

                // People to demote: all admins EXCEPT bot and the protected owner
                const demoteTargets = admins.filter(jid =>
                    normalizeJid(jid) !== normalizeJid(botId) &&
                    normalizeJid(jid) !== normalizeJid(ownerJid)
                );

                // Demote in chunks
                for (let i = 0; i < demoteTargets.length; i += 10) {
                    await sock.groupParticipantsUpdate(from, demoteTargets.slice(i, i + 10), 'demote');
                }

                await sock.sendMessage(from, {
                    text: `✅ AntiHijack enforced\nDemoted ${demoteTargets.length} admins.\nBot + super admin protected.`,
                    mentions: demoteTargets
                }, { quoted: message });
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Enforce failed: ${e.message}` }, { quoted: message });
            }
            return;
        }

        const value = action === 'on';
        const conf = await getAntiHijackConfig(from);
        conf.enabled = value;
        conf.ownerJid = conf.ownerJid || sender;
        await setAntiHijackConfig(from, conf);

        await sock.sendMessage(from, {
            text: `🛡️ AntiHijack is now *${value ? 'ON' : 'OFF'}*\nOwner: @${sender.split('@')[0]}\n\nWhen ON, messages containing "hijack", "bug", or "crashgc" auto-trigger enforce.`,
            mentions: [sender]
        }, { quoted: message });
    }
};
