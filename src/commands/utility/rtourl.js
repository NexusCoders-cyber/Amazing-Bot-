import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const FONTS_FILE = path.resolve(process.cwd(), 'fonts/fontmap.json');
const FONT_ID = 'small_caps';

const UPLOAD_URL = 'https://tmp.ilom.dev/upload';
const ALLOWED_EXPIRY = new Set(['1h', '6h', '24h', '7d', '30d']);

function loadFont(fontId = FONT_ID) {
    try {
        if (!fs.existsSync(FONTS_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(FONTS_FILE, 'utf8'));
        if (!data || !Array.isArray(data.fonts)) return null;
        return data.fonts.find((font) => font.id === fontId)?.map || null;
    } catch {
        return null;
    }
}

function sf(text, fontMap) {
    if (!fontMap) return String(text);
    return String(text)
        .split('')
        .map((char) => fontMap[char] || fontMap[char.toUpperCase()] || char)
        .join('');
}

async function sendWrappedText(sock, message, from, text) {
    return await sock.sendMessage(from, {
        text
    }, {
        quoted: message
    });
}

function humanSize(bytes) {
    const b = Number(bytes);
    if (!b || Number.isNaN(b)) return 'N/A';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(2)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function parseFlags(input = '') {
    const tokens = String(input).trim().split(/\s+/).filter(Boolean);

    const out = {
        type: 'permanent',
        expiry: null,
        burnAfterRead: false,
        password: null,
        errors: []
    };

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i].toLowerCase();

        if (t === '-perm' || t === '--permanent') {
            out.type = 'permanent';
            out.expiry = null;
            continue;
        }

        if (t === '-temp' || t === '--temp') {
            out.type = 'temp';
            if (!out.expiry) out.expiry = '24h';
            continue;
        }

        if (t === '-burn' || t === '--burn') {
            out.burnAfterRead = true;
            continue;
        }

        if (t === '-exp' || t === '--expiry') {
            const val = (tokens[i + 1] || '').toLowerCase();
            if (!val) {
                out.errors.push('Missing expiry value after -exp');
            } else if (!ALLOWED_EXPIRY.has(val)) {
                out.errors.push(`Invalid expiry "${val}"`);
            } else {
                out.expiry = val;
                i++;
            }
            continue;
        }

        if (t === '-pass' || t === '--password') {
            const val = tokens[i + 1] || '';
            if (!val) {
                out.errors.push('Missing password value after -pass');
            } else {
                out.password = val;
                i++;
            }
            continue;
        }

        if (t.startsWith('-')) out.errors.push(`Unknown flag "${tokens[i]}"`);
    }

    if (out.type === 'permanent') out.expiry = null;
    return out;
}

function getReplyMedia(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;

    if (quoted.imageMessage) return { mediaObj: quoted.imageMessage, mediaType: 'image', filename: quoted.imageMessage.fileName || 'image.jpg' };
    if (quoted.videoMessage) return { mediaObj: quoted.videoMessage, mediaType: 'video', filename: quoted.videoMessage.fileName || 'video.mp4' };
    if (quoted.audioMessage) return { mediaObj: quoted.audioMessage, mediaType: 'audio', filename: quoted.audioMessage.fileName || 'audio.mp3' };
    if (quoted.documentMessage) return { mediaObj: quoted.documentMessage, mediaType: 'document', filename: quoted.documentMessage.fileName || 'file.bin' };
    if (quoted.stickerMessage) return { mediaObj: quoted.stickerMessage, mediaType: 'sticker', filename: 'sticker.webp' };

    return null;
}

export default {
    name: 'rtourl',
    aliases: ['replytourl'],
    category: 'utility',
    description: 'Upload replied media and return CDN URL',
    usage: 'rtourl [-perm | -temp -exp 24h] [-burn] [-pass secret]',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, args }) {
        try {
            const fontMap = loadFont();
            const S = (t) => sf(t, fontMap);
            const mediaInfo = getReplyMedia(message);
            const flags = parseFlags((args || []).join(' '));

            if (!mediaInfo || flags.errors.length) {
                const errLine = flags.errors.length
                    ? `🔹 *${S('Flag Error')}* : _${flags.errors[0]}_\n─────────────────────\n`
                    : '';

                return await sendWrappedText(
                    sock,
                    message,
                    from,
                    `*${S('RTOURL — USAGE')}*\n`
                    + `─────────────────────\n`
                    + `🔹 *${S('Rule')}*      : _Reply to a media/file first_\n`
                    + `🔹 *${S('Basic')}*     : \`.rtourl\` _(permanent default)_\n`
                    + `🔹 *${S('Permanent')}* : \`.rtourl -perm\`\n`
                    + `🔹 *${S('Temporary')}* : \`.rtourl -temp -exp 7d\`\n`
                    + `🔹 *${S('Burn')}*      : \`.rtourl -burn\`\n`
                    + `🔹 *${S('Password')}*  : \`.rtourl -pass mysecret\`\n`
                    + `🔹 *${S('Full')}*      : \`.rtourl -temp -exp 24h -burn -pass mysecret\`\n`
                    + `─────────────────────\n`
                    + `🔹 *${S('Expiry')}*    : _1h, 6h, 24h, 7d, 30d (temp only)_\n`
                    + `🔹 *${S('Output')}*    : _Returns cdnUrl_\n`
                    + `─────────────────────\n`
                    + errLine
                    + ''
                );
            }

            await sendWrappedText(
                sock,
                message,
                from,
                `*${S('RTOURL')}*\n`
                + `─────────────────────\n`
                + `🔹 *${S('Status')}* : _Uploading replied media..._\n`
                + `🔹 *${S('Type')}*   : _${flags.type}_\n`
                + `🔹 *${S('Expiry')}* : _${flags.expiry || 'N/A'}_\n`
                + `🔹 *${S('Burn')}*   : _${flags.burnAfterRead ? 'true' : 'false'}_\n`
                + `─────────────────────\n`
                + ''
            );

            const targetMessage = { message: { [`${mediaInfo.mediaType}Message`]: mediaInfo.mediaObj } };
            const buffer = await downloadMediaMessage(
                targetMessage,
                'buffer',
                {},
                { reuploadRequest: sock.updateMediaMessage }
            );

            const form = new FormData();
            form.append('file', buffer, { filename: mediaInfo.filename });
            form.append('type', flags.type);
            if (flags.type === 'temp' && flags.expiry) form.append('expiry', flags.expiry);
            if (flags.burnAfterRead) form.append('burnAfterRead', 'true');
            if (flags.password) form.append('password', flags.password);

            const apiKey = process.env.ILOM_TMP_KEY || process.env.GEMINI_API_KEY || '';
            const res = await axios.post(UPLOAD_URL, form, {
                headers: {
                    ...form.getHeaders(),
                    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 60000,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                validateStatus: () => true
            });

            if (res.status < 200 || res.status >= 300 || !res.data?.success) {
                const reason = res.data?.message || `HTTP ${res.status}`;
                return await sendWrappedText(
                    sock,
                    message,
                    from,
                    `*${S('RTOURL ERROR')}*\n`
                    + `─────────────────────\n`
                    + `🔹 *${S('Status')}* : _Upload failed_\n`
                    + `🔹 *${S('Reason')}* : _${reason}_\n`
                    + `─────────────────────\n`
                    + ''
                );
            }

            const json = res.data || {};
            const link = json.cdnUrl || json.directUrl || 'N/A';

            return await sendWrappedText(
                sock,
                message,
                from,
                `*${S('RTOURL SUCCESS')}*\n`
                + `─────────────────────\n`
                + `🔹 *${S('ID')}*       : \`${json.id || 'N/A'}\`\n`
                + `🔹 *${S('Type')}*     : _${json.type || flags.type}_\n`
                + `🔹 *${S('Expiry')}*   : _${json.expiry || (flags.type === 'permanent' ? 'N/A' : '24h')}_\n`
                + `🔹 *${S('Burn')}*     : _${flags.burnAfterRead ? 'true' : 'false'}_\n`
                + `🔹 *${S('Password')}* : _${flags.password ? 'Yes' : 'No'}_\n`
                + `🔹 *${S('Size')}*     : _${humanSize(json.sizeBytes)}_\n`
                + `🔹 *${S('Mime')}*     : _${json.mimeType || 'N/A'}_\n`
                + `─────────────────────\n`
                + `🔗 ${link}\n`
                + `─────────────────────\n`
                + ''
            );
        } catch (error) {
            return await sendWrappedText(
                sock,
                message,
                from,
                `*❌ rtourl error*\n`
                + `─────────────────────\n`
                + `\`\`\`${error.message}\`\`\`\n`
                + `─────────────────────\n`
                + ''
            );
        }
    }
};
