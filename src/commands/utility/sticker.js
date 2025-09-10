const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const config = require('../../config');

module.exports = {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    category: 'utility',
    description: 'Convert image/video to sticker',
    usage: 'sticker (reply to image/video)',
    cooldown: 3,
    permissions: ['user'],

    async execute(sock, message) {
        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = quotedMessage?.imageMessage || message.message?.imageMessage;
        const videoMessage = quotedMessage?.videoMessage || message.message?.videoMessage;

        if (!imageMessage && !videoMessage) {
            return sock.sendMessage(message.key.remoteJid, {
                text: `❌ Please reply to an image or video!\n\nUsage: ${config.prefix}sticker (reply to image/video)`
            });
        }

        try {
            await sock.sendMessage(message.key.remoteJid, {
                text: '🔄 Creating sticker...'
            });

            let mediaBuffer;
            let mimetype;

            if (imageMessage) {
                mediaBuffer = await sock.downloadMediaMessage(quotedMessage || message);
                mimetype = imageMessage.mimetype;
            } else {
                mediaBuffer = await sock.downloadMediaMessage(quotedMessage || message);
                mimetype = videoMessage.mimetype;
                
                if (videoMessage.seconds > 10) {
                    return sock.sendMessage(message.key.remoteJid, {
                        text: '❌ Video is too long! Maximum duration is 10 seconds.'
                    });
                }
            }

            const sticker = new Sticker(mediaBuffer, {
                pack: config.stickerPackName || 'Ilom Bot',
                author: config.stickerAuthorName || 'Created by Ilom',
                type: StickerTypes.FULL,
                categories: ['🤖'],
                id: '12345',
                quality: 50,
                background: 'transparent'
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(message.key.remoteJid, {
                sticker: stickerBuffer
            });

        } catch (error) {
            console.error('Sticker creation error:', error);
            await sock.sendMessage(message.key.remoteJid, {
                text: '❌ Failed to create sticker. Please try with a different image/video.'
            });
        }
    }
};