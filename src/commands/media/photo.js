import axios from 'axios';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function downloadQuotedImage(quoted) {
    const msgType = quoted.imageMessage ? 'imageMessage' :
                    quoted.stickerMessage ? 'stickerMessage' : null;
    if (!msgType) return null;
    const stream = await downloadContentFromMessage(quoted[msgType], msgType.replace('Message', ''));
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

export default {
    name: 'photo',
    aliases: ['image', 'img'],
    category: 'media',
    description: 'Send an image from a URL or reply to an image message',
    usage: 'photo <url> | photo (reply to image)',
    cooldown: 3,
    args: false,
    minArgs: 0,

    async execute({ sock, message, from, args }) {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const url = args.join(' ').trim();

        // Case 1: Reply to an image message
        if (quoted?.imageMessage || quoted?.stickerMessage) {
            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });
                const buffer = await downloadQuotedImage(quoted);
                if (!buffer) throw new Error('Could not download image');

                await sock.sendMessage(from, {
                    image: buffer,
                    caption: '📸 *Photo*'
                }, { quoted: message });
                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
            } catch (e) {
                await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                await sock.sendMessage(from, { text: `❌ photo error: ${e.message}` }, { quoted: message });
            }
            return;
        }

        // Case 2: URL provided in args
        if (!url) {
            return await sock.sendMessage(from, {
                text: '📸 *Photo Command*\n\nUsage:\n• `.photo <image url>` — send image from link\n• `.photo` (reply to an image) — re-send the replied image'
            }, { quoted: message });
        }

        // Validate URL
        if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)/i.test(url) && !/^https?:\/\//i.test(url)) {
            return await sock.sendMessage(from, {
                text: '❌ Please provide a valid image URL (jpg, png, gif, webp).'
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

            const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            const referrers = ['https://www.google.com/', 'https://www.bing.com/', 'https://duckduckgo.com/'];

            let buffer = null;
            for (const ref of referrers) {
                try {
                    const resp = await axios.get(url, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: {
                            'User-Agent': ua,
                            'Referer': ref,
                            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9'
                        }
                    });
                    buffer = Buffer.from(resp.data);
                    if (buffer.length >= 1024) break;
                } catch {}
            }

            if (!buffer || buffer.length < 1024) throw new Error('Could not download image (all sources blocked)');

            await sock.sendMessage(from, {
                image: buffer,
                caption: '📸 *Photo*'
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (e) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(from, { text: `❌ photo error: ${e.message}` }, { quoted: message });
        }
    }
};
