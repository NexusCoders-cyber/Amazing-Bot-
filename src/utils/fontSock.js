import { applyFont } from './fontManager.js';
import { getUserFont, getGlobalFont } from './fontStorage.js';

const SKIP_KEYS = new Set([
    'image', 'video', 'audio', 'sticker', 'document',
    'react', 'delete', 'forward', 'poll', 'location',
    'contact', 'product', 'order', 'groupInviteMessage'
]);

const TEXT_KEYS = ['text', 'caption'];

function transformContent(content, font) {
    if (!content || font === 'normal') return content;
    if (typeof content === 'string') return applyFont(content, font);

    const hasSkipKey = SKIP_KEYS.has(Object.keys(content).find(k => SKIP_KEYS.has(k)));
    if (hasSkipKey) {
        const result = { ...content };
        for (const key of TEXT_KEYS) {
            if (result[key] && typeof result[key] === 'string') {
                result[key] = applyFont(result[key], font);
            }
        }
        return result;
    }

    const result = { ...content };
    for (const key of TEXT_KEYS) {
        if (result[key] && typeof result[key] === 'string') {
            result[key] = applyFont(result[key], font);
        }
    }

    if (result.contextInfo?.externalAdReply?.title) {
        result.contextInfo = {
            ...result.contextInfo,
            externalAdReply: {
                ...result.contextInfo.externalAdReply,
                title: applyFont(result.contextInfo.externalAdReply.title, font),
                body: result.contextInfo.externalAdReply.body
                    ? applyFont(result.contextInfo.externalAdReply.body, font)
                    : undefined
            }
        };
    }

    return result;
}

export function createFontSock(sock, sender) {
    let cachedFont = null;
    let lastFetch = 0;
    const CACHE_MS = 30000;

    async function getFont() {
        const now = Date.now();
        if (cachedFont !== null && now - lastFetch < CACHE_MS) return cachedFont;
        const globalFont = await getGlobalFont();
        if (globalFont && globalFont !== 'normal') {
            cachedFont = globalFont;
            lastFetch = now;
            return cachedFont;
        }
        if (sender) {
            const userFont = await getUserFont(sender);
            cachedFont = userFont || 'normal';
        } else {
            cachedFont = 'normal';
        }
        lastFetch = now;
        return cachedFont;
    }

    return new Proxy(sock, {
        get(target, prop) {
            if (prop === 'sendMessage') {
                return async (jid, content, options) => {
                    try {
                        const font = await getFont();
                        const transformed = font !== 'normal'
                            ? transformContent(content, font)
                            : content;
                        return await target.sendMessage(jid, transformed, options);
                    } catch {
                        return await target.sendMessage(jid, content, options);
                    }
                };
            }
            if (prop === '_invalidateFontCache') {
                return () => { cachedFont = null; lastFetch = 0; };
            }
            return typeof target[prop] === 'function'
                ? target[prop].bind(target)
                : target[prop];
        }
    });
}
