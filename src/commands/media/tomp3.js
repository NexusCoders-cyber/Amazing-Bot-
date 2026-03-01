import fs from 'fs';
import path from 'path';
import fileTypeModule from 'file-type';
const { fileTypeFromBuffer } = fileTypeModule;
import ffmpeg from 'fluent-ffmpeg';
import config from '../../config.js';

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanTempFile(filePath) {
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

async function streamToBuffer(stream) {
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

async function convertToMp3(inputBuffer, fileTypeExt, isVideo = false) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(TEMP_DIR, `input.${fileTypeExt}`);
        const outputPath = path.join(TEMP_DIR, `output_${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, inputBuffer);

        let command = ffmpeg(inputPath)
            .audioCodec('libmp3lame')
            .audioBitrate(128)
            .format('mp3');

        if (isVideo) {
            command = command.noVideo(); // Extract audio only
        }

        command
            .on('error', (err) => {
                cleanTempFile(inputPath);
                reject(err);
            })
            .on('end', () => {
                cleanTempFile(inputPath);
                const mp3Buffer = fs.readFileSync(outputPath);
                cleanTempFile(outputPath);
                resolve(mp3Buffer);
            })
            .save(outputPath);
    });
}

export default {
    name: 'tomp3',
    aliases: ['mp3', 'toaudio', 'tom p3'],
    category: 'media',
    description: 'Convert replied voice/video/audio to MP3 (extracts audio from videos)',
    usage: 'tomp3 [reply to voice/video/audio]',
    example: 'Reply to voice/video with tomp3',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: true,
    supportsChat: true,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, from, prefix }) {
        try {
            let mediaMsg = message.message;
            let isVideo = false;
            let mediaObject = null;

            if (message.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                mediaMsg = message.message.extendedTextMessage.contextInfo.quotedMessage;
            }

            if (mediaMsg.audioMessage) {
                mediaObject = mediaMsg.audioMessage;
            } else if (mediaMsg.voiceMessage) {
                mediaObject = mediaMsg.voiceMessage;
            } else if (mediaMsg.videoMessage) {
                mediaObject = mediaMsg.videoMessage;
                isVideo = true;
            } else if (mediaMsg.documentMessage && mediaMsg.documentMessage.mimetype?.startsWith('audio/')) {
                mediaObject = mediaMsg.documentMessage;
            }

            if (!mediaObject) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nReply to voice, audio, or video to convert to MP3!\n\n💡 Example: Reply with \`${prefix}tomp3\``
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '🎵', key: message.key }
            });

            let mediaType = 'audio';
            if (mediaMsg.videoMessage) {
                mediaType = 'video';
            } else if (mediaMsg.documentMessage) {
                mediaType = 'document';
            }

            const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
            const stream = await downloadContentFromMessage(mediaObject, mediaType);
            const mediaBuffer = await streamToBuffer(stream);
            const fileType = await fileTypeFromBuffer(mediaBuffer);
            const supportedExts = ['ogg', 'mp3', 'm4a', 'wav', 'mp4', 'webm'];

            if (!fileType || !supportedExts.includes(fileType.ext)) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nUnsupported format. Try OGG/MP3 for audio or MP4 for video.`
                }, { quoted: message });
                return;
            }

            const mp3Buffer = await convertToMp3(mediaBuffer, fileType.ext, isVideo);

            await sock.sendMessage(from, {
                audio: mp3Buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                caption: mediaObject.caption ? `MP3: ${mediaObject.caption}` : 'Converted to MP3'
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('ToMP3 command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to convert to MP3: ${error.message}\n\n💡 Check FFmpeg install & media format.`
            }, { quoted: message });
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};