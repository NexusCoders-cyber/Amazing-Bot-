import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { fileTypeFromBuffer } from 'file-type';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

function nodeOf(raw = {}) {
    return raw?.ephemeralMessage?.message
        || raw?.viewOnceMessage?.message
        || raw?.viewOnceMessageV2?.message
        || raw;
}

function extractSource(message) {
    const quoted = nodeOf(message?.message?.extendedTextMessage?.contextInfo?.quotedMessage || {});
    const direct = nodeOf(message?.message || {});
    const src = Object.keys(quoted).length ? quoted : direct;

    if (src.videoMessage) return { media: src.videoMessage, type: 'video', kind: 'video' };
    if (src.imageMessage) return { media: src.imageMessage, type: 'image', kind: 'image' };
    if (src.audioMessage) return { media: src.audioMessage, type: 'audio', kind: 'audio' };
    if (src.stickerMessage) return { media: src.stickerMessage, type: 'sticker', kind: 'image' };
    if (src.documentMessage) {
        const mime = String(src.documentMessage.mimetype || '').toLowerCase();
        if (mime.startsWith('video/')) return { media: src.documentMessage, type: 'document', kind: 'video' };
        if (mime.startsWith('audio/')) return { media: src.documentMessage, type: 'document', kind: 'audio' };
        if (mime.startsWith('image/')) return { media: src.documentMessage, type: 'document', kind: 'image' };
    }
    return null;
}

function convertToMp4(inputBuffer, inExt, kind) {
    return new Promise((resolve, reject) => {
        const stamp = Date.now();
        const inputPath = path.join(TEMP_DIR, `tomp4_in_${stamp}.${inExt}`);
        const outputPath = path.join(TEMP_DIR, `tomp4_out_${stamp}.mp4`);
        fs.writeFileSync(inputPath, inputBuffer);

        const cleanup = () => [inputPath, outputPath].forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));

        let cmd;
        if (kind === 'video') {
            cmd = ffmpeg(inputPath).videoCodec('libx264').audioCodec('aac').format('mp4').outputOptions(['-movflags +faststart']);
        } else if (kind === 'image') {
            cmd = ffmpeg(inputPath)
                .loop(4)
                .videoCodec('libx264')
                .outputOptions(['-pix_fmt yuv420p', '-t 4'])
                .format('mp4');
        } else {
            cmd = ffmpeg()
                .input('color=black:s=720x720:d=10').inputFormat('lavfi')
                .input(inputPath)
                .outputOptions(['-shortest'])
                .videoCodec('libx264')
                .audioCodec('aac')
                .format('mp4');
        }

        cmd.on('error', (err) => {
            cleanup();
            reject(err);
        }).on('end', () => {
            const out = fs.readFileSync(outputPath);
            cleanup();
            resolve(out);
        }).save(outputPath);
    });
}

function inferExt(fileType, mime = '', kind = 'video') {
    if (fileType?.ext) return fileType.ext;
    const m = String(mime || '').toLowerCase();
    if (m.includes('webm')) return 'webm';
    if (m.includes('mp4')) return 'mp4';
    if (m.includes('ogg')) return 'ogg';
    if (m.includes('mp3')) return 'mp3';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
    if (m.includes('png')) return 'png';
    return kind === 'image' ? 'jpg' : 'mp4';
}

export default {
    name: 'tomp4',
    aliases: ['tovideo', 'mp4'],
    category: 'media',
    description: 'Convert replied media to MP4',
    usage: 'tomp4 (reply to media)',
    cooldown: 5,

    async execute({ sock, message, from, prefix }) {
        const src = extractSource(message);
        if (!src) {
            return sock.sendMessage(from, { text: `❌ Reply to audio/video/image/sticker first.\nExample: ${prefix}tomp4` }, { quoted: message });
        }

        try {
            const stream = await downloadContentFromMessage(src.media, src.type);
            const input = await streamToBuffer(stream);
            const fileType = await fileTypeFromBuffer(input);
            const ext = inferExt(fileType, src.media?.mimetype, src.kind);
            const out = await convertToMp4(input, ext, src.kind);

            await sock.sendMessage(from, {
                video: out,
                mimetype: 'video/mp4',
                caption: '✅ Converted to MP4.'
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, { text: `❌ Failed to convert: ${error.message}` }, { quoted: message });
        }
    }
};
