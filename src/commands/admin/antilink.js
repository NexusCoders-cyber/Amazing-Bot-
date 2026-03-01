import { getGroupAntilink, setGroupAntilink } from '../../utils/antilinkStore.js';

function hasLink(text) {
    if (!text || typeof text !== 'string') return false;
    const patterns = [
        /https?:\/\/[^\s]+/i,
        /www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*/i,
        /chat\.whatsapp\.com\/[^\s]+/i,
        /wa\.me\/[^\s]+/i,
        /t\.me\/[^\s]+/i,
        /discord\.gg\/[^\s]+/i,
        /bit\.ly\/[^\s]+/i,
        /tinyurl\.com\/[^\s]+/i,
        /youtu\.be\/[^\s]+/i,
        /[a-zA-Z0-9-]+\.[a-zA-Z]{2,4}\/[^\s]{3,}/i,
    ];
    return patterns.some(p => p.test(text));
}

function extractText(message) {
    if (!message?.message) return '';
    const msg = message.message;
    return msg.conversation
        || msg.extendedTextMessage?.text
        || msg.imageMessage?.caption
        || msg.videoMessage?.caption
        || msg.documentMessage?.caption
        || '';
}

export async function checkAntilink(sock, message) {
    try {
        const from = message.key.remoteJid;
        if (!from?.endsWith('@g.us')) return false;

        const enabled = await getGroupAntilink(from);
        if (enabled !== true) return false;

        const text = extractText(message);
        if (!hasLink(text)) return false;

        const sender = message.key.participant || message.key.remoteJid;
        const botNumber = sock.user?.id?.split(':')[0]?.split('@')[0]?.replace(/\D/g, '');
        const senderNumber = sender.split(':')[0].split('@')[0].replace(/\D/g, '');

        if (botNumber && botNumber === senderNumber) return false;

        try {
            const meta = await sock.groupMetadata(from);
            const member = meta.participants.find(p =>
                p.id.split(':')[0].split('@')[0].replace(/\D/g, '') === senderNumber
            );
            if (member?.admin) return false;
        } catch {}

        try {
            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    id: message.key.id,
                    fromMe: false,
                    participant: sender
                }
            });
        } catch {}

        await sock.sendMessage(from, {
            text: `⚠️ @${senderNumber} links are not allowed in this group!`,
            mentions: [sender]
        });

        return true;
    } catch {
        return false;
    }
}

export default {
    name: 'antilink',
    aliases: ['nolink', 'antilinks'],
    category: 'admin',
    description: 'Toggle anti-link protection for the group',
    usage: 'antilink <on|off|status>',
    example: 'antilink on',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const action = args[0]?.toLowerCase();

        if (action === 'status' || action === 'check') {
            const enabled = await getGroupAntilink(from);
            return await sock.sendMessage(from, {
                text: `🔗 Anti-Link Protection\n\nStatus: ${enabled ? '✅ Enabled' : '❌ Disabled'}`
            }, { quoted: message });
        }

        if (!['on', 'off'].includes(action)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid option.\n\nUsage:\nantilink on\nantilink off\nantilink status`
            }, { quoted: message });
        }

        const enabled = action === 'on';
        const storage = await setGroupAntilink(from, enabled);
        const storageLabel = storage === 'db' ? '🗄️ MongoDB' : storage === 'json' ? '📄 File' : '💾 Memory';

        await sock.sendMessage(from, {
            text: `🔗 Anti-Link Protection\n\nStatus: ${enabled ? '✅ Enabled' : '❌ Disabled'}\nStorage: ${storageLabel}\n\n${enabled
                ? 'Links sent by non-admins will now be deleted.'
                : 'Link protection is now off. Links are allowed.'}`
        }, { quoted: message });
    }
};
