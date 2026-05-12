import fs from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import ky from 'ky';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const UPLOAD_URLS = [
    'https://tmp.malvryx.dev/upload',
    'https://tmpfiles.org/api/v1/upload'
];
const ALLOWED_EXPIRY = new Set(['1h', '6h', '24h', '7d', '30d']);

function humanSize(bytes) {
    const b = Number(bytes);
    if (!b || Number.isNaN(b)) return 'N/A';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(2)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function parseFlags(input = '') {
    const tokens = String(input).trim().split(/\s+/).filter(Boolean);
    const out = { type: 'permanent', expiry: null, burnAfterRead: false, password: null, errors: [] };

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i].toLowerCase();
        if (t === '-perm' || t === '--permanent') { out.type = 'permanent'; out.expiry = null; continue; }
        if (t === '-temp' || t === '--temp') { out.type = 'temp'; if (!out.expiry) out.expiry = '24h'; continue; }
        if (t === '-burn' || t === '--burn') { out.burnAfterRead = true; continue; }

        if (t === '-exp' || t === '--expiry') {
            const val = (tokens[i + 1] || '').toLowerCase();
            if (!val) out.errors.push('Missing expiry value after -exp');
            else if (!ALLOWED_EXPIRY.has(val)) out.errors.push(`Invalid expiry "${val}"`);
            else { out.expiry = val; i++; }
            continue;
        }

        if (t === '-pass' || t === '--password') {
            const val = tokens[i + 1] || '';
            if (!val) out.errors.push('Missing password value after -pass');
            else { out.password = val; i++; }
            continue;
        }

        if (t.startsWith('-')) out.errors.push(`Unknown flag "${tokens[i]}"`);
    }

    if (out.type === 'permanent') out.expiry = null;
    return out;
}

function getQuotedMediaMessage(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;

    if (quoted.imageMessage) return { message: { imageMessage: quoted.imageMessage }, kind: 'image', ext: 'jpg' };
    if (quoted.videoMessage) return { message: { videoMessage: quoted.videoMessage }, kind: 'video', ext: 'mp4' };
    if (quoted.audioMessage) return { message: { audioMessage: quoted.audioMessage }, kind: 'audio', ext: 'mp3' };
    if (quoted.documentMessage) return { message: { documentMessage: quoted.documentMessage }, kind: 'document', ext: 'bin' };
    if (quoted.stickerMessage) return { message: { stickerMessage: quoted.stickerMessage }, kind: 'sticker', ext: 'webp' };

    return null;
}

export default {
    name: 'rtourl',
    aliases: ['repliedtourl'],
    category: 'media',
    description: 'Upload replied media/file and return CDN URL',
    usage: 'rtourl [-perm|-temp -exp 24h -burn -pass key]',
    example: 'rtourl -temp -exp 24h -burn',
    cooldown: 8,
    permissions: ['user'],

    async execute({ sock, message, args, from }) {
        const quotedMedia = getQuotedMediaMessage(message);
        const flags = parseFlags(args.join(' '));

        if (!quotedMedia || flags.errors.length) {
            const errLine = flags.errors[0] ? `\n\n🔹 *Flag Error:* ${flags.errors[0]}` : '';
            return await sock.sendMessage(from, {
                text:
                    '*RTOURL — USAGE*\n' +
                    '─────────────────────\n' +
                    '🔹 Basic: `.rtourl` (permanent default)\n' +
                    '🔹 Permanent: `.rtourl -perm`\n' +
                    '🔹 Temporary: `.rtourl -temp -exp 7d`\n' +
                    '🔹 Burn: `.rtourl -burn`\n' +
                    '🔹 Password: `.rtourl -pass mysecret`\n' +
                    '🔹 Full: `.rtourl -temp -exp 24h -burn -pass mysecret`\n' +
                    '─────────────────────\n' +
                    '🔹 Expiry: 1h, 6h, 24h, 7d, 30d (temp only)' +
                    errLine
            }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '⏳', key: message.key } });

        const tempPath = path.join(process.cwd(), 'src/cache', `rtourl_${Date.now()}.${quotedMedia.ext}`);

        try {
            const mediaBuffer = await downloadMediaMessage(
                quotedMedia,
                'buffer',
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );

            await fs.ensureDir(path.dirname(tempPath));
            await fs.writeFile(tempPath, mediaBuffer);

            const form = new FormData();
            form.append('file', mediaBuffer, { filename: `upload.${quotedMedia.ext}` });
            form.append('type', flags.type);
            if (flags.type === 'temp' && flags.expiry) form.append('expiry', flags.expiry);
            if (flags.burnAfterRead) form.append('burnAfterRead', 'true');
            if (flags.password) form.append('password', flags.password);

            const apiKey = process.env.MALVRYX_TMP_KEY || process.env.MALVRYX_API_KEY || '';
            let res = null;
            let lastError = null;
            for (const url of UPLOAD_URLS) {
                try {
                    res = await ky.post(url, {
                        body: form,
                        headers: {
                            ...form.getHeaders(),
                            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
                            'User-Agent': 'Mozilla/5.0'
                        },
                        timeout: 60000
                    }).json();
                    if (res) break;
                } catch (error) {
                    lastError = error;
                }
            }
            if (!res) throw lastError || new Error('All upload endpoints failed');

            if (!res?.success && !res?.data?.url) {
                throw new Error(res?.message || 'Upload failed');
            }

            const link = res.cdnUrl || res.directUrl || res?.data?.url || res?.data?.download_url || 'N/A';
            await sock.sendMessage(from, {
                text:
                    '*RTOURL SUCCESS*\n' +
                    '─────────────────────\n' +
                    `🔹 ID: ${res.id || 'N/A'}\n` +
                    `🔹 Type: ${res.type || flags.type}\n` +
                    `🔹 Expiry: ${res.expiry || (flags.type === 'permanent' ? 'N/A' : '24h')}\n` +
                    `🔹 Burn: ${flags.burnAfterRead ? 'true' : 'false'}\n` +
                    `🔹 Password: ${flags.password ? 'Yes' : 'No'}\n` +
                    `🔹 Size: ${humanSize(res.sizeBytes)}\n` +
                    `🔹 Mime: ${res.mimeType || 'N/A'}\n` +
                    '─────────────────────\n' +
                    `🔗 ${link}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ rtourl error\n\n${error.message}`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        } finally {
            await fs.remove(tempPath).catch(() => {});
        }
    }
};
