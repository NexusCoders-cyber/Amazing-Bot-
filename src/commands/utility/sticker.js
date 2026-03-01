import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import pkg from 'wa-sticker-formatter';
const { Sticker, StickerTypes } = pkg;

async function downloadMedia(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

export default {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    category: 'utility',
    description: 'Convert image or video to sticker',
    usage: 'sticker (reply to image/video) OR send image with caption .sticker',
    example: 'sticker (reply to image)',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,

    async execute({ sock, message, from, args, prefix }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMsg = quoted?.imageMessage || message.message?.imageMessage;
        const videoMsg = quoted?.videoMessage || message.message?.videoMessage;

        if (!imageMsg && !videoMsg) {
            return await sock.sendMessage(from, {
                text: `Reply to an image or video with ${prefix}sticker\nOr send an image with the caption ${prefix}sticker`
            }, { quoted: message });
        }

        const processingMsg = await sock.sendMessage(from, {
            text: 'Creating sticker...'
        }, { quoted: message });

        try {
            let mediaBuffer;
            let isVideo = false;

            if (imageMsg) {
                const msgToDownload = quoted?.imageMessage ? quoted : message.message;
                mediaBuffer = await downloadMedia(imageMsg, 'image');
            } else {
                if (videoMsg.seconds > 10) {
                    await sock.sendMessage(from, { delete: processingMsg.key });
                    return await sock.sendMessage(from, {
                        text: 'Video is too long! Maximum duration is 10 seconds for stickers.'
                    }, { quoted: message });
                }
                mediaBuffer = await downloadMedia(videoMsg, 'video');
                isVideo = true;
            }

            const botName = process.env.BOT_NAME || 'Ilom Bot';
            const ownerName = process.env.OWNER_NAME || 'Ilom';

            const stickerOptions = {
                pack: args[0] || botName,
                author: args[1] || ownerName,
                type: isVideo ? StickerTypes.FULL : StickerTypes.FULL,
                categories: ['🤖'],
                quality: 80,
                background: 'transparent'
            };

            const sticker = new Sticker(mediaBuffer, stickerOptions);
            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(from, { delete: processingMsg.key });
            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            await sock.sendMessage(from, { delete: processingMsg.key });
            await sock.sendMessage(from, {
                text: `Failed to create sticker: ${error.message}\nTry with a different image or video.`
            }, { quoted: message });
        }
    }
};
