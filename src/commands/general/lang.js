import { listSupportedLangs, resolveChatLanguage, setChatLanguage, normalizeLang } from '../../utils/languageManager.js';

function formatLangList(limit = null) {
    const pairs = Object.entries(listSupportedLangs()).sort((a, b) => a[0].localeCompare(b[0]));
    const picked = limit ? pairs.slice(0, limit) : pairs;
    return picked.map(([code, name]) => `│ • ${code} — ${name}`).join('\n');
}

export default {
    name: 'lang',
    aliases: ['language', 'setlang'],
    category: 'general',
    description: 'Set chat language for bot responses',
    usage: 'setlang <code> | setlang list | setlang reset',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, args, from, isGroup, isGroupAdmin, isOwner, isSudo, prefix }) {
        const current = await resolveChatLanguage(from);
        const input = String(args[0] || '').toLowerCase().trim();

        if (!input) {
            return sock.sendMessage(from, {
                text: [
                    '🌐 *LANGUAGE SETTINGS*',
                    '',
                    `📍 Your Current Language: *${current}* (${listSupportedLangs()[current] || 'Custom'})`,
                    '',
                    'Usage:',
                    `${prefix}setlang fr   → set French`,
                    `${prefix}setlang reset → back to English`,
                    `${prefix}setlang list  → all language codes`,
                    '',
                    'Common Language Codes:',
                    formatLangList(),
                    '',
                    '⚠️ Menu will be translated and cached on first use.',
                    'Each person sets their own language independently.'
                ].join('\n')
            }, { quoted: message });
        }

        if (input === 'list' || input === 'all') {
            return sock.sendMessage(from, {
                text: [
                    '🌐 *SUPPORTED LANGUAGES*',
                    '',
                    formatLangList(),
                    '',
                    '*How to use:*',
                    `${prefix}setlang yo`,
                    `${prefix}setlang fr`,
                    `${prefix}setlang reset`
                ].join('\n')
            }, { quoted: message });
        }

        if (isGroup && !(isGroupAdmin || isOwner || isSudo)) {
            return sock.sendMessage(from, { text: '❌ Only group admins can change group language.' }, { quoted: message });
        }

        await sock.sendMessage(from, { text: `⏳ Validating language code *${input}*...` }, { quoted: message });

        const nextCode = input === 'reset' || input === 'default' ? 'en' : normalizeLang(input);
        if (!nextCode) {
            return sock.sendMessage(from, {
                text: `❌ Unsupported language code: *${input}*\n\nUse ${prefix}setlang list to see valid codes.`
            }, { quoted: message });
        }

        await setChatLanguage(from, nextCode);

        return sock.sendMessage(from, {
            text: [
                '✅ *Language Updated*',
                `All bot replies now use: *${nextCode}*`,
                '',
                `To reset: ${prefix}setlang reset`
            ].join('\n')
        }, { quoted: message });
    }
};
