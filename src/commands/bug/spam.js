import { isPremiumUser } from '../../utils/premiumStore.js';

export default {
    name: 'spam', aliases: ['spammsg', 'spamnumber'], category: 'bug',
    description: 'Spam a target with messages', usage: 'spam <number>,<message>,<count>', cooldown: 30, ownerOnly: true,
    async execute({ sock, message, args, from, sender, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner) return sock.sendMessage(from, { text: '❌ Premium required. Use .unlock 0814880' }, { quoted: message });
        const q = (message.message?.conversation || message.message?.extendedTextMessage?.text || '');
        const parts = q.split(',').map(x => x?.trim());
        const [targetNum, text, countRaw] = parts;
        const count = parseInt(countRaw) || 5;
        if (!targetNum || !text) return sock.sendMessage(from, { text: '❌ Usage: .spam 234xxx,your message,10' }, { quoted: message });
        if (count > 100) return sock.sendMessage(from, { text: '❌ Max 100' }, { quoted: message });
        const jid = `${targetNum.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        await sock.sendMessage(from, { text: `💬 Spamming ${targetNum} x${count}` }, { quoted: message });
        for (let i = 0; i < count; i++) { await sock.sendMessage(jid, { text }); await new Promise(r => setTimeout(r, 700)); }
        await sock.sendMessage(from, { text: '✅ Done' }, { quoted: message });
    }
};
