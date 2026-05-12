import axios from 'axios';

export default {
    name: 'jid',
    aliases: ['lid', 'uid', 'getjid'],
    category: 'utility',
    description: 'Get JID/LID of a user or group link',
    usage: '.jid (reply to user) | .jid https://chat.whatsapp.com/xxx',
    cooldown: 3,

    async execute({ sock, message, args, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo || {};
        const quoted = ctx?.participant || null;
        const mentioned = ctx?.mentionedJid || [];
        const text = args.join(' ').trim();

        // Group link mode
        if (text.includes('chat.whatsapp.com') || text.includes('whatsapp.com')) {
            const linkMatch = text.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
            if (!linkMatch) return sock.sendMessage(from, { text: '❌ Invalid link.' }, { quoted: message });
            try {
                const code = linkMatch[1];
                const gcData = await sock.groupGetInviteInfo(code);
                await sock.sendMessage(from, {
                    text: `🔗 *Group Info*\n\n📌 *Name:* ${gcData.subject || 'Unknown'}\n👥 *Members:* ${gcData.size || '?'}\n📍 *JID:* ${gcData.id}\n🔢 *LID:* ${(gcData.id || '').split('@')[0]}\n👑 *Owner:* ${gcData.owner || 'N/A'}`
                }, { quoted: message });
            } catch { return sock.sendMessage(from, { text: '❌ Cannot fetch group info.' }, { quoted: message }); }
            return;
        }

        // User mode
        const target = quoted || mentioned[0] || message.key.participant || message.key.remoteJid;
        const lid = target.split('@')[0];

        let msg = `👤 *User Info*\n\n📍 *JID:* ${target}\n🔢 *LID:* ${lid}`;
        try {
            const name = await sock.getName(target);
            msg += `\n📛 *Name:* ${name}`;
        } catch {}
        try {
            const status = await sock.fetchStatus(target);
            msg += `\n📝 *Status:* ${status?.status || 'N/A'}`;
        } catch {}

        if (from.endsWith('@g.us')) {
            const meta = await sock.groupMetadata(from).catch(() => null);
            if (meta) {
                const p = meta.participants.find(x => x.id === target);
                if (p) msg += `\n👑 *Admin:* ${p.admin || 'No'}`;
            }
        }
        await sock.sendMessage(from, { text: msg }, { quoted: message });
    }
};
