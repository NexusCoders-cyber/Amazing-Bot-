import fs from 'fs';
import path from 'path';

const CODE_MAX_BYTES = 80 * 1024;
const BOT_JID = process.env.BOT_JID || '867051314767696@bot';
const COMMAND_CATEGORIES = ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'];

function normalizeInputPath(input = '') {
    return String(input || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');
}

function isSafeRelativePath(filePath = '') {
    if (!filePath) return false;
    if (filePath.includes('\0')) return false;
    if (filePath.split('/').includes('..')) return false;
    return true;
}

function detectLang(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const map = { '.js': 'javascript', '.ts': 'typescript', '.json': 'json', '.py': 'python', '.sh': 'bash', '.md': 'markdown' };
    return map[ext] || 'text';
}

function tokenize(codeStr, lang = 'javascript') {
    const keywords = {
        javascript: ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'async', 'await', 'class', 'new', 'if', 'else', 'for', 'while', 'try', 'catch'],
        typescript: ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'async', 'await', 'class', 'interface', 'type', 'enum'],
        python: ['import', 'from', 'def', 'return', 'class', 'if', 'else', 'for', 'while', 'try', 'except']
    };
    const langKeys = keywords[lang] || keywords.javascript;
    return codeStr.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return { highlightType: 0, codeContent: `${line}\n` };
        if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith('*')) return { highlightType: 4, codeContent: `${line}\n` };
        const hasKeyword = langKeys.some((kw) => new RegExp(`(^|\\s|\\(|;)${kw}(\\s|\\(|;|$|:)`).test(trimmed));
        if (hasKeyword) return { highlightType: 1, codeContent: `${line}\n` };
        if (trimmed.includes('(')) return { highlightType: 3, codeContent: `${line}\n` };
        if ((line.match(/"/g) || []).length >= 2 || (line.match(/'/g) || []).length >= 2) return { highlightType: 2, codeContent: `${line}\n` };
        return { highlightType: 0, codeContent: `${line}\n` };
    });
}

async function sendNativeCodeBlock(sock, jid, codeContent, fileName = 'code.js') {
    const lang = detectLang(fileName);
    const blocks = tokenize(codeContent, lang);
    return sock.relayMessage(jid, {
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 5, codeMetadata: { codeLanguage: lang, codeBlocks: blocks } }],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: BOT_JID },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, {});
}

export default {
    name: 'plugins',
    aliases: ['pluginfile', 'plug'],
    category: 'owner',
    description: 'Fetch and send command files as native WhatsApp code view blocks.',
    usage: 'plugins get <category/file.js>',
    example: 'plugins get media/togcstatus.js',
    cooldown: 1,
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, prefix }) {
        const action = String(args[0] || '').toLowerCase();
        const commandsRoot = path.join(process.cwd(), 'src', 'commands');

        if (!action || action === 'help') {
            return await sock.sendMessage(from, {
                text:
                    `📦 *PLUGINS COMMAND*\n\n` +
                    `• ${prefix}plugins get media/togcstatus.js\n` +
                    `• ${prefix}plugins list\n\n` +
                    `No channel/newsletter links are attached.`
            }, { quoted: message });
        }

        if (action === 'list' || action === 'ls') {
            return await sock.sendMessage(from, {
                text: `📁 Available categories:\n${COMMAND_CATEGORIES.map(c => `• ${c}`).join('\n')}`
            }, { quoted: message });
        }

        if (action !== 'get' && action !== 'fetch') {
            return await sock.sendMessage(from, {
                text: `❌ Unknown action.\nUse: ${prefix}plugins get <category/file.js>`
            }, { quoted: message });
        }

        const relPath = normalizeInputPath(args[1] || '');
        if (!isSafeRelativePath(relPath) || !relPath.includes('/')) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid path.\nExample: ${prefix}plugins get media/togcstatus.js`
            }, { quoted: message });
        }

        const [category] = relPath.split('/');
        if (!COMMAND_CATEGORIES.includes(category)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid category "${category}".`
            }, { quoted: message });
        }

        const targetPath = path.join(commandsRoot, relPath);
        const resolvedTarget = path.resolve(targetPath);
        const resolvedRoot = path.resolve(commandsRoot) + path.sep;
        if (!resolvedTarget.startsWith(resolvedRoot)) {
            return await sock.sendMessage(from, { text: '❌ Path escaped commands directory.' }, { quoted: message });
        }

        if (!fs.existsSync(resolvedTarget)) {
            return await sock.sendMessage(from, {
                text: `❌ File not found: ${relPath}`
            }, { quoted: message });
        }

        const content = fs.readFileSync(resolvedTarget, 'utf8');
        if (Buffer.byteLength(content, 'utf8') > CODE_MAX_BYTES) {
            return await sock.sendMessage(from, {
                text: `❌ File too large for native code view.\nUse cmd get to receive as file.\nSize: ${Buffer.byteLength(content, 'utf8')} bytes`
            }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `📄 *${relPath}*\nLines: ${content.split('\n').length}\nSize: ${Buffer.byteLength(content, 'utf8')} bytes`
        }, { quoted: message });
        await sendNativeCodeBlock(sock, from, content, path.basename(relPath));
    }
};
