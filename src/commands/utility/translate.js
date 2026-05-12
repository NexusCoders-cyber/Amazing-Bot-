import translate from 'translate-google-api';

function extractQuotedText(message) {
    const quoted = message?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return '';
    return quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || quoted.videoMessage?.caption || '';
}

function parseInput(args, quotedText) {
    const raw = args.join(' ').trim();

    if (quotedText) {
        const lang = (args[0] || 'en').toLowerCase();
        return { text: quotedText.trim(), target: lang };
    }

    if (!raw) return { text: '', target: 'en' };

    let target = 'en';
    let text = raw;

    // format: text -> fr
    const m = raw.match(/^(.*?)(?:\s*(?:->|=>)\s*)([a-zA-Z-]{2,8})$/);
    if (m) {
        text = m[1].trim();
        target = m[2].toLowerCase();
        return { text, target };
    }

    // format: fr hello world
    const first = args[0]?.toLowerCase();
    if (/^[a-z]{2,8}$/i.test(first) && args.length > 1) {
        target = first;
        text = args.slice(1).join(' ').trim();
    }

    return { text, target };
}

export default {
    name: 'translate',
    aliases: ['tr', 'trans'],
    category: 'utility',
    description: 'Translate text or a replied message accurately using Google Translate',
    usage: 'translate <text> -> <lang> | translate <lang> <text> | reply + translate <lang>',
    example: 'translate hello world -> fr\ntranslate es how are you\n(reply) translate en',
    cooldown: 3,
    permissions: ['user'],
    args: false,
    supportsReply: true,

    async execute({ sock, message, args, from, prefix }) {
        try {
            const quotedText = extractQuotedText(message);
            const { text, target } = parseInput(args, quotedText);

            if (!text) {
                return await sock.sendMessage(from, {
                    text: `🌐 *Translate Usage*\n\n• ${prefix}translate hello -> fr\n• ${prefix}translate es how are you\n• Reply message + ${prefix}translate en`
                }, { quoted: message });
            }

            if (text.length > 2000) {
                return await sock.sendMessage(from, {
                    text: '❌ Text too long. Please keep under 2000 characters.'
                }, { quoted: message });
            }

            const result = await translate(text, { to: target });
            const translated = Array.isArray(result) ? result.join('') : String(result || '').trim();

            if (!translated) {
                return await sock.sendMessage(from, { text: '❌ Translation failed. Try again.' }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: `🌐 *Translation*\n\n📝 Original: ${text}\n\n✅ Translated (${target}): ${translated}`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Translation error: ${error.message}`
            }, { quoted: message });
        }
    }
};
