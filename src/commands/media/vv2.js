import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function downloadMedia(msg) {
    const messageType = Object.keys(msg)[0];
    const stream = await downloadContentFromMessage(msg[messageType], messageType.replace('Message', ''));
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

export default {
    name: 'wow',
    aliases: ['🥹', 'wow'],
    category: 'media',
    description: 'Stealth extract view-once media to bot DM',
    usage: 'wow / 🥹 (reply to viewonce)',
    cooldown: 3,
    noPrefix: true,

    async execute({ sock, message, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const targetUser = ctx?.participant;

        if (!quoted || !targetUser) return;

        try {
            let type;
            if (quoted.imageMessage) type = 'image';
            else if (quoted.videoMessage) type = 'video';
            else if (quoted.audioMessage) type = 'audio';
            else return;

            const mediaBuffer = await downloadMedia(quoted);
            if (!mediaBuffer?.length) return;

            // Send to bot's own DM (stealth - no messages in group)
            const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net' || sock.user?.id;
            if (!botJid) return;

            if (type === 'image') {
                await sock.sendMessage(botJid, { image: mediaBuffer, caption: '🔓 Stealth view-once capture' });
            } else if (type === 'video') {
                await sock.sendMessage(botJid, { video: mediaBuffer, caption: '🔓 Stealth view-once capture' });
            } else {
                await sock.sendMessage(botJid, { audio: mediaBuffer, mimetype: 'audio/mp4', ptt: quoted.audioMessage?.ptt || false });
            }
        } catch {}
    }
};
