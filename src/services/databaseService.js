/**
 * Simple file-based database for sticker command bindings
 */
import fs from 'fs-extra';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'sticker-cmds.json');

function load() {
    try {
        if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {}
    return {};
}

function save(data) {
    fs.ensureDirSync(path.dirname(DATA_FILE));
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getUserStickerCmds(userId) {
    const data = load();
    return data[userId] || {};
}

export function setUserStickerCmd(userId, fingerprint, commandName) {
    const data = load();
    if (!data[userId]) data[userId] = {};
    data[userId][fingerprint] = commandName.replace(/^\./, '');
    save(data);
}

export function removeUserStickerCmd(userId, fingerprint) {
    const data = load();
    if (data[userId]) {
        delete data[userId][fingerprint];
        if (Object.keys(data[userId]).length === 0) delete data[userId];
        save(data);
    }
}

export function clearUserStickerCmds(userId) {
    const data = load();
    delete data[userId];
    save(data);
}

export function getStickerCmdByFingerprint(fingerprint) {
    const data = load();
    for (const userId of Object.keys(data)) {
        if (data[userId][fingerprint]) return data[userId][fingerprint];
    }
    return null;
}


// ─── Language Preferences ───────────────────────────
const LANG_FILE = path.join(process.cwd(), 'data', 'user-langs.json');

function loadLangs() {
    try { if (fs.existsSync(LANG_FILE)) return JSON.parse(fs.readFileSync(LANG_FILE, 'utf8')); } catch {}
    return {};
}

function saveLangs(data) {
    fs.ensureDirSync(path.dirname(LANG_FILE));
    fs.writeFileSync(LANG_FILE, JSON.stringify(data, null, 2));
}

export function getUserLang(userId, botNumber) {
    const data = loadLangs();
    return data[userId]?.lang || 'en';
}

export function setUserLang(userId, botNumber, lang) {
    const data = loadLangs();
    if (!data[userId]) data[userId] = {};
    data[userId].lang = lang;
    data[userId].botNumber = botNumber;
    data[userId].updatedAt = Date.now();
    saveLangs(data);
}

export function clearUserLang(userId, botNumber) {
    const data = loadLangs();
    if (data[userId]) delete data[userId];
    saveLangs(data);
}

export function clearMenuCache(lang) {
    // Menu cache cleared on next request
}

export function getPrefixForSession(botNumber) {
    return process.env.PREFIX || '.';
}
