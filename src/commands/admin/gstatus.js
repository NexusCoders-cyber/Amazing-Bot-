import { downloadMediaMessage } from '@whiskeysockets/baileys';

function generateMessageId() {
    return `3EB0${Math.random().toString(36).slice(2, 15)}${Math.random().toString(36).slice(2, 15)}`;
}

function getQuotedContext(message, from) {
    const ctx = message?.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const quotedKey = ctx?.stanzaId
        ? { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant }
        : undefined;

    return { quoted, quotedKey };
}

export default {
    name: 'gcstatus',
    aliases: ['groupstatus', 'togstatus', 'togcstatus', 'gstatus'],
    category: 'admin',
    description: 'Post text or replied media to WhatsApp group status',
    usage: 'gcstatus [text] (or reply to image/video/audio/text)',
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, args }) {
        try {
            const textInput = args?.join(' ')?.trim() || '';
            const { quoted, quotedKey } = getQuotedContext(message, from);

            await sock.sendMessage(from, { react: { text: '📢', key: message.key } });

            if (!quoted && !textInput) {
                return await sock.sendMessage(from, {
                    text: [
                        '📢 *Group Status*',
                        '',
                        'Reply to an image/video/audio/text, or provide text.',
                        '',
                        '*Examples:*',
                        '• `gcstatus Hello group!`',
                        '• reply to media and send `gcstatus optional caption`'
                    ].join('\n')
                }, { quoted: message });
            }

            if (!quoted && textInput) {
                const statusInnerMessage = {
                    extendedTextMessage: {
                        text: textInput,
                        backgroundArgb: 0xFF000000,
                        textArgb: 0xFFFFFFFF,
                        font: 1,
                        contextInfo: {
                            mentionedJid: [],
                            isGroupStatus: true
                        }
                    }
                };

                const statusPayload = {
                    groupStatusMessageV2: {
                        message: statusInnerMessage
                    }
                };

                try {
                    await sock.sendMessage(from, statusPayload, { messageId: generateMessageId() });
                } catch {
                    await sock.sendMessage(from, {
                        text: textInput,
                        contextInfo: { isGroupStatus: true }
                    });
                }

                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return await sock.sendMessage(from, { text: '✅ Text status posted.' }, { quoted: message });
            }

            const mime = quoted?.imageMessage?.mimetype
                || quoted?.videoMessage?.mimetype
                || quoted?.audioMessage?.mimetype
                || '';

            if (quoted?.conversation || quoted?.extendedTextMessage?.text) {
                const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
                const finalText = textInput ? `${quotedText}\n\n${textInput}` : quotedText;

                await sock.sendMessage(from, {
                    text: finalText,
                    contextInfo: { isGroupStatus: true }
                });

                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return await sock.sendMessage(from, { text: '✅ Text posted to group status.' }, { quoted: message });
            }

            if (/image/i.test(mime) || quoted?.imageMessage) {
                const imageBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { imageMessage: quoted.imageMessage } },
                    'buffer',
                    {}
                );

                if (!imageBuffer) throw new Error('media-download-fail');

                await sock.sendMessage(from, {
                    image: imageBuffer,
                    caption: textInput || '',
                    contextInfo: { isGroupStatus: true }
                });

                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return await sock.sendMessage(from, { text: '✅ Image posted to group status.' }, { quoted: message });
            }

            if (/video/i.test(mime) || quoted?.videoMessage) {
                const videoBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { videoMessage: quoted.videoMessage } },
                    'buffer',
                    {}
                );

                if (!videoBuffer) throw new Error('media-download-fail');

                const sizeInMB = videoBuffer.length / (1024 * 1024);
                if (sizeInMB > 30) {
                    await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
                    return await sock.sendMessage(from, { text: '❌ Video too large. Max size is 30MB.' }, { quoted: message });
                }

                await sock.sendMessage(from, {
                    video: videoBuffer,
                    caption: textInput || '',
                    contextInfo: { isGroupStatus: true }
                });

                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return await sock.sendMessage(from, { text: '✅ Video posted to group status.' }, { quoted: message });
            }

            if (/audio/i.test(mime) || quoted?.audioMessage) {
                const audioBuffer = await downloadMediaMessage(
                    { key: quotedKey, message: { audioMessage: quoted.audioMessage } },
                    'buffer',
                    {}
                );

                if (!audioBuffer) throw new Error('media-download-fail');

                await sock.sendMessage(from, {
                    audio: audioBuffer,
                    mimetype: quoted?.audioMessage?.mimetype || 'audio/mp4',
                    ptt: quoted?.audioMessage?.ptt || false,
                    contextInfo: { isGroupStatus: true }
                });

                await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
                return await sock.sendMessage(from, { text: '✅ Audio posted to group status.' }, { quoted: message });
            }

            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
            return await sock.sendMessage(from, {
                text: '❌ Unsupported message type. Supported: text, image, video, audio.'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });

            const lowered = String(error?.message || '').toLowerCase();
            let hint = error?.message || 'Unknown error';

            if (lowered.includes('not-authorized')) hint = 'Bot not authorized to post group status.';
            else if (lowered.includes('forbidden')) hint = 'Permission denied for group status.';
            else if (lowered.includes('media-download-fail')) hint = 'Media download failed.';

            return await sock.sendMessage(from, {
                text: `❌ Failed to post status: ${hint}`
            }, { quoted: message });
        }
    }
};
