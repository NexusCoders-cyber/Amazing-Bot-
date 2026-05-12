import axios from 'axios';
export default {
    name: 'profile', aliases: ['pp', 'pfp'], category: 'fun',
    description: 'Get profile picture, name, and about of a user', usage: 'profile [@user]',
    cooldown: 5,
    async execute({ sock, message, from, sender }) {
        const mentioned = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || sender;
        try {
            const pp = await sock.profilePictureUrl(target, 'image').catch(() => null);
            const name = await sock.getName(target).catch(() => 'Unknown');
            let msg = `👤 *${name}*\n🔑 ${target.split('@')[0]}`;
            if (pp) await sock.sendMessage(from, { image: { url: pp }, caption: msg }, { quoted: message });
            else await sock.sendMessage(from, { text: msg }, { quoted: message });
        } catch (e) { await sock.sendMessage(from, { text: '❌ ' + e.message }, { quoted: message }); }
    }
};
