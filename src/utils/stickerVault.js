import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

const DIR = path.join(process.cwd(), 'data', 'sticker-vault');
const META = path.join(DIR, 'meta.json');

async function loadMeta() {
    try { return await fs.readJSON(META); } catch { return { chats: {} }; }
}

async function saveMeta(meta) {
    await fs.ensureDir(DIR);
    await fs.writeJSON(META, meta, { spaces: 2 });
}

export async function collectSticker(sock, message, chatId) {
    try {
        const sticker = message.message?.stickerMessage;
        if (!sticker) return;
        const buffer = await sock.downloadMediaMessage({ message: { stickerMessage: sticker } });
        if (!buffer?.length) return;

        await fs.ensureDir(DIR);
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const file = path.join(DIR, `${hash}.webp`);
        if (!await fs.pathExists(file)) await fs.writeFile(file, buffer);

        const meta = await loadMeta();
        if (!meta.chats[chatId]) meta.chats[chatId] = [];
        if (!meta.chats[chatId].includes(`${hash}.webp`)) {
            meta.chats[chatId].push(`${hash}.webp`);
            if (meta.chats[chatId].length > 200) meta.chats[chatId] = meta.chats[chatId].slice(-200);
            await saveMeta(meta);
        }
    } catch {}
}

export async function getRandomSticker(chatId) {
    const meta = await loadMeta();
    const files = meta.chats[chatId] || [];
    if (!files.length) return null;
    const pick = files[Math.floor(Math.random() * files.length)];
    const filePath = path.join(DIR, pick);
    if (!await fs.pathExists(filePath)) return null;
    return fs.readFile(filePath);
}


export async function getStickerHashFromMessage(sock, message) {
    try {
        const sticker = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage || message.message?.stickerMessage;
        if (!sticker) return null;
        const buffer = await sock.downloadMediaMessage({ message: { stickerMessage: sticker } });
        if (!buffer?.length) return null;
        return crypto.createHash('md5').update(buffer).digest('hex');
    } catch { return null; }
}

export async function setStickerAction(chatId, hash, action = {}) {
    const meta = await loadMeta();
    if (!meta.actions) meta.actions = {};
    if (!meta.actions[chatId]) meta.actions[chatId] = {};
    meta.actions[chatId][hash] = {
        tagEveryone: !!action.tagEveryone,
        suspendedUser: action.suspendedUser || null
    };
    await saveMeta(meta);
}

export async function getStickerActionByHash(chatId, hash) {
    if (!hash) return null;
    const meta = await loadMeta();
    return meta.actions?.[chatId]?.[hash] || null;
}

export async function listStickerActions(chatId) {
    const meta = await loadMeta();
    const data = meta.actions?.[chatId] || {};
    return Object.entries(data).map(([hash, action]) => ({ hash, ...action }));
}

export async function deleteStickerAction(chatId, hash) {
    const meta = await loadMeta();
    if (meta.actions?.[chatId]?.[hash]) {
        delete meta.actions[chatId][hash];
        await saveMeta(meta);
    }
}
