import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    name: 'tostatus',
    aliases: ['poststatus', 'post', 'mystatus'],
    category: 'media',
    description: 'Post replied media/text as your WhatsApp status',
    usage: '.tostatus (reply to image/video/text)',
    cooldown: 10,

    async execute({ sock, message, args, from }) {
        const ctx = message.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;

        if (!quoted) return sock.sendMessage(from, { text: '❌ Reply to an image, video, or text to post as status.' }, { quoted: message });

        // Text mode
        const convText = quoted.conversation || quoted.extendedTextMessage?.text;
        if (convText) {
            try {
                const extra = args.join(' ').trim();
                const statusText = extra ? `${convText}\n\n${extra}` : convText;
                await sock.sendMessage('status@broadcast', { text: statusText });
                await sock.sendMessage(from, { text: '✅ Posted to your status!' }, { quoted: message });
            } catch { await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: message }); }
            return;
        }

        // Media mode
        const mediaType = ['imageMessage', 'videoMessage', 'audioMessage'].find(k => quoted[k]);
        if (!mediaType) return sock.sendMessage(from, { text: '❌ Reply to image/video/audio to post as status.' }, { quoted: message });

        const type = mediaType === 'imageMessage' ? 'image' : mediaType === 'videoMessage' ? 'video' : 'audio';
        const mediaContent = quoted[mediaType];
        const caption = quoted[mediaType]?.caption || args.join(' ').trim() || '';

        try {
            const stream = await downloadContentFromMessage(mediaContent, mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            await sock.sendMessage('status@broadcast', { [type]: buffer, caption, mimetype: mediaContent?.mimetype });
            await sock.sendMessage(from, { text: '✅ Posted to your status!' }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ Failed to post status.' }, { quoted: message }); }
    }
};
