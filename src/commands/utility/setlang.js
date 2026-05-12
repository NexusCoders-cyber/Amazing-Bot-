import { getUserLang, setUserLang, clearUserLang, clearMenuCache, getPrefixForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import { translateText, setUserLangCache } from '../../utils/translator.js';
import logger from '../../utils/logger.js';

const COMMON_LANGS = [
  { code: 'af', name: 'Afrikaans' }, { code: 'ar', name: 'Arabic' }, { code: 'zh', name: 'Chinese' },
  { code: 'nl', name: 'Dutch' }, { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' }, { code: 'id', name: 'Indonesian' }, { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' }, { code: 'ms', name: 'Malay' },
  { code: 'pt', name: 'Portuguese' }, { code: 'ru', name: 'Russian' }, { code: 'es', name: 'Spanish' },
  { code: 'sw', name: 'Swahili' }, { code: 'th', name: 'Thai' }, { code: 'tr', name: 'Turkish' },
  { code: 'ur', name: 'Urdu' }, { code: 'vi', name: 'Vietnamese' }, { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' },
];

export default {
    name: 'setlang',
    aliases: ['lang'],
    category: 'utility',
    description: 'Set your preferred language for bot replies and menu',
    usage: 'setlang <code> | setlang reset',
    cooldown: 3,

    async execute({ sock, message, args, from, sender }) {
        const userId = sender;
        const botNumber = normalizeJidToNumber(sock?.user?.id, sock);
        const prefix = process.env.PREFIX || '.';
        const current = getUserLang(userId, botNumber);
        const input = String(args[0] || '').toLowerCase().trim();

        if (!input) {
            const langList = COMMON_LANGS.map(l => `  • ${l.code} — ${l.name}`).join('\n');
            return sock.sendMessage(from, {
                text: `🌐 *LANGUAGE SETTINGS*\n\n📍 Your Language: ${current === 'en' ? 'English (default)' : current}\n\nUsage:\n  ${prefix}setlang fr → French\n  ${prefix}setlang reset → English\n\nCommon codes:\n${langList}\n\n⚠️ Menu will be translated on first use.`
            }, { quoted: message });
        }

        if (input === 'reset' || input === 'en') {
            clearUserLang(userId, botNumber);
            setUserLangCache(userId, null);
            return sock.sendMessage(from, { text: '✅ Language reset to English.' }, { quoted: message });
        }

        try {
            const test = await translateText('Hello! Language set successfully.', input);
            if (!test || test === 'Hello! Language set successfully.') {
                return sock.sendMessage(from, { text: `❌ Invalid code "${input}". Try: fr, es, de, hi, ar` }, { quoted: message });
            }
            setUserLang(userId, botNumber, input);
            setUserLangCache(userId, input);
            clearMenuCache(input);

            const success = await translateText('✅ Language updated! All bot replies will now be in your language.', input);
            await sock.sendMessage(from, { text: success }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: message });
        }
    }
};
