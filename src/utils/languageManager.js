import translate from 'translate-google-api';
import { getGroup, updateGroup } from '../models/Group.js';
import { getUser, updateUser } from '../models/User.js';

const SUPPORTED_LANGS = {
    en: 'English', af: 'Afrikaans', ar: 'Arabic', zh: 'Chinese', nl: 'Dutch', fr: 'French', de: 'German',
    hi: 'Hindi', id: 'Indonesian', it: 'Italian', ja: 'Japanese', ko: 'Korean', ms: 'Malay',
    pt: 'Portuguese', ru: 'Russian', es: 'Spanish', sw: 'Swahili', th: 'Thai', tr: 'Turkish',
    ur: 'Urdu', vi: 'Vietnamese', yo: 'Yoruba', zu: 'Zulu', pl: 'Polish'
};

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

export function normalizeLang(input = '') {
    const code = String(input || '').trim().toLowerCase();
    if (!code) return 'en';
    if (SUPPORTED_LANGS[code]) return code;
    const short = code.split('-')[0];
    return SUPPORTED_LANGS[short] ? short : '';
}

export function listSupportedLangs() {
    return { ...SUPPORTED_LANGS };
}

export function isSupportedLang(code = '') {
    return !!SUPPORTED_LANGS[normalizeLang(code)];
}

export async function resolveChatLanguage(jid = '') {
    if (!jid) return 'en';

    if (jid.endsWith('@g.us')) {
        const group = await getGroup(jid);
        return normalizeLang(group?.settings?.language || 'en') || 'en';
    }

    if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid') || jid.endsWith('@c.us')) {
        const user = await getUser(jid);
        return normalizeLang(user?.language || 'en') || 'en';
    }

    return 'en';
}

export async function setChatLanguage(jid = '', lang = 'en') {
    const normalized = normalizeLang(lang);
    if (!normalized) throw new Error('Unsupported language code.');

    if (jid.endsWith('@g.us')) {
        await updateGroup(jid, { $set: { 'settings.language': normalized } });
        return normalized;
    }

    await updateUser(jid, { $set: { language: normalized } });
    return normalized;
}

function getCached(targetLang, text) {
    const key = `${targetLang}:${text}`;
    const item = cache.get(key);
    if (!item) return '';
    if (Date.now() - item.ts > CACHE_TTL) {
        cache.delete(key);
        return '';
    }
    return item.value;
}

function setCached(targetLang, text, value) {
    cache.set(`${targetLang}:${text}`, { value, ts: Date.now() });
}

export async function translateTextIfNeeded(text = '', targetLang = 'en') {
    const clean = String(text || '');
    const lang = normalizeLang(targetLang);
    if (!clean.trim() || !lang || lang === 'en') return clean;

    const cached = getCached(lang, clean);
    if (cached) return cached;

    try {
        const result = await translate(clean, { to: lang });
        const translated = Array.isArray(result) ? result.join('') : String(result || '').trim();
        const out = translated || clean;
        setCached(lang, clean, out);
        return out;
    } catch {
        return clean;
    }
}

export async function translateOutgoingContent(content = {}, targetLang = 'en') {
    if (!content || typeof content !== 'object') return content;
    const lang = normalizeLang(targetLang);
    if (!lang || lang === 'en') return content;

    const next = { ...content };
    if (typeof next.text === 'string') {
        next.text = await translateTextIfNeeded(next.text, lang);
    }
    if (typeof next.caption === 'string') {
        next.caption = await translateTextIfNeeded(next.caption, lang);
    }

    if (next.contextInfo?.externalAdReply) {
        const ad = { ...next.contextInfo.externalAdReply };
        if (typeof ad.title === 'string') ad.title = await translateTextIfNeeded(ad.title, lang);
        if (typeof ad.body === 'string') ad.body = await translateTextIfNeeded(ad.body, lang);
        next.contextInfo = { ...next.contextInfo, externalAdReply: ad };
    }

    return next;
}
