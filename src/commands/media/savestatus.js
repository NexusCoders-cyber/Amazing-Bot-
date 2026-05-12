import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    name: 'savestatus',
    aliases: ['ss', 'savestory', 'dlstatus'],
    category: 'media',
    description: 'Save a status update to your DM',
    usage: '.ss (reply to status)',
    cooldown: 3,

    async execute({ sock, message, from, sender }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        if (!quoted) return sock.sendMessage(from, { text: '❌ Reply to a status.' }, { quoted: message });

        const mediaType = ['imageMessage', 'videoMessage', 'audioMessage'].find(k => quoted[k]);
        if (!mediaType) return sock.sendMessage(from, { text: '❌ Reply to image/video/audio status.' }, { quoted: message });

        const type = mediaType === 'imageMessage' ? 'image' : mediaType === 'videoMessage' ? 'video' : 'audio';
        const mimetype = quoted[mediaType]?.mimetype || '';

        try {
            const stream = await downloadContentFromMessage(quoted[mediaType], mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // Send to caller's DM
            await sock.sendMessage(sender, { [type]: buffer, mimetype, caption: '📥 Status saved' });
            await sock.sendMessage(from, { text: '✅ Sent to your DM!' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
    }
};
