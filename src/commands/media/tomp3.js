import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { fileTypeFromBuffer } from 'file-type';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function streamToBuffer(stream) {
    return new Promise(async (resolve, reject) => {
        try {
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            resolve(Buffer.concat(chunks));
        } catch (error) {
            reject(error);
        }
    });
}

function getMessageNode(rawMessage = {}) {
    const msg = rawMessage?.ephemeralMessage?.message
        || rawMessage?.viewOnceMessage?.message
        || rawMessage?.viewOnceMessageV2?.message
        || rawMessage;
    return msg || {};
}

function extractMediaSource(message) {
    const quotedRaw = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    const quoted = getMessageNode(quotedRaw);
    const direct = getMessageNode(message?.message || {});
    const src = quotedRaw ? quoted : direct;

    if (src.audioMessage) return { media: src.audioMessage, type: 'audio' };
    if (src.videoMessage) return { media: src.videoMessage, type: 'video' };
    if (src.documentMessage) {
        const mime = String(src.documentMessage.mimetype || '').toLowerCase();
        if (mime.startsWith('audio/')) return { media: src.documentMessage, type: 'document' };
        if (mime.startsWith('video/')) return { media: src.documentMessage, type: 'document', isVideo: true };
    }

    return null;
}

function inferExt(fileType, mime = '', isVideo = false) {
    if (fileType?.ext) return fileType.ext;
    const m = String(mime || '').toLowerCase();
    if (m.includes('ogg')) return 'ogg';
    if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
    if (m.includes('wav')) return 'wav';
    if (m.includes('aac')) return 'aac';
    if (m.includes('webm')) return 'webm';
    if (m.includes('mp4')) return isVideo ? 'mp4' : 'm4a';
    return isVideo ? 'mp4' : 'ogg';
}

function convertToMp3(inputBuffer, ext, isVideo = false) {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(TEMP_DIR, `tomp3_in_${Date.now()}.${ext}`);
        const outputPath = path.join(TEMP_DIR, `tomp3_out_${Date.now()}.mp3`);

        fs.writeFileSync(inputPath, inputBuffer);

        let cmd = ffmpeg(inputPath).audioCodec('libmp3lame').audioBitrate('128k').format('mp3');
        if (isVideo) cmd = cmd.noVideo();

        cmd.on('error', (err) => {
            [inputPath, outputPath].forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
            reject(err);
        }).on('end', () => {
            const out = fs.readFileSync(outputPath);
            [inputPath, outputPath].forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
            resolve(out);
        }).save(outputPath);
    });
}

export default {
    name: 'tomp3',
    aliases: ['mp3', 'toaudio'],
    category: 'media',
    description: 'Convert replied audio/video to MP3',
    usage: 'tomp3 (reply to any audio/video media)',
    cooldown: 5,

    async execute({ sock, message, from, prefix }) {
        const src = extractMediaSource(message);
        if (!src) {
            return sock.sendMessage(from, {
                text: `❌ Reply to an audio or video message.\nExample: ${prefix}tomp3`
            }, { quoted: message });
        }

        try {
            await sock.sendMessage(from, { react: { text: '🎵', key: message.key } });
            const stream = await downloadContentFromMessage(src.media, src.type);
            const input = await streamToBuffer(stream);
            const fileType = await fileTypeFromBuffer(input);
            const ext = inferExt(fileType, src.media?.mimetype, src.type === 'video' || src.isVideo);
            const out = await convertToMp3(input, ext, src.type === 'video' || src.isVideo);

            await sock.sendMessage(from, {
                audio: out,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed to convert: ${error.message}` }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
