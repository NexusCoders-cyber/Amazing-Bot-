import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';

const fsp = fs.promises;

const BOT_JID = process.env.BOT_JID || '867051314767696@bot';
const DEFAULT_MAX_MB = 50;
const HARD_MAX_MB = 200;
const CODE_MAX_BYTES = 80 * 1024;

function detectLang(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const map = {
        '.js': 'javascript', '.ts': 'typescript', '.py': 'python', '.java': 'java', '.go': 'go',
        '.json': 'json', '.html': 'html', '.css': 'css', '.md': 'markdown', '.sh': 'bash', '.txt': 'text'
    };
    return map[ext] || 'text';
}

function tokenize(codeStr, lang = 'javascript') {
    const keywords = {
        javascript: ['import', 'export', 'const', 'let', 'var', 'function', 'return', 'async', 'await', 'class', 'new', 'if', 'else', 'for', 'while', 'try', 'catch'],
        python: ['import', 'from', 'def', 'return', 'class', 'if', 'else', 'for', 'while', 'try', 'except']
    };

    const langKeys = keywords[lang] || keywords.javascript;

    return codeStr.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return { highlightType: 0, codeContent: `${line}\n` };
        if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--')) return { highlightType: 4, codeContent: `${line}\n` };
        const hasKeyword = langKeys.some((kw) => new RegExp(`(^|\\s|\\(|;)${kw}(\\s|\\(|;|$|:)`).test(trimmed));
        if (hasKeyword) return { highlightType: 1, codeContent: `${line}\n` };
        if (trimmed.includes('(')) return { highlightType: 3, codeContent: `${line}\n` };
        if ((line.match(/"/g) || []).length >= 2 || (line.match(/'/g) || []).length >= 2) return { highlightType: 2, codeContent: `${line}\n` };
        return { highlightType: 0, codeContent: `${line}\n` };
    });
}

function tokenizeInput(input) {
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    const out = [];
    let m;
    while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3]);
    return out;
}

function parseArgs(raw) {
    const args = tokenizeInput(raw || '');
    const opt = { zip: false, code: false, customLang: null, maxMB: DEFAULT_MAX_MB, target: null, help: false };

    for (let i = 0; i < args.length; i += 1) {
        const a = args[i];
        if (a === '-h' || a === '--help') opt.help = true;
        else if (a === '-z' || a === '--zip') opt.zip = true;
        else if (a === '-c' || a === '--code') opt.code = true;
        else if (a === '-l' || a === '--lang') opt.customLang = args[++i] || null;
        else if (a === '--max') {
            const v = Number(args[++i]);
            if (!Number.isNaN(v) && v > 0) opt.maxMB = Math.min(v, HARD_MAX_MB);
        } else if (!a.startsWith('-') && !opt.target) opt.target = a;
    }

    return opt;
}

async function statSafe(p) {
    try { return await fsp.stat(p); } catch { return null; }
}

function zipDirectory(dirPath, zipPath) {
    return new Promise((resolve, reject) => {
        execFile('zip', ['-r', '-q', zipPath, '.'], { cwd: dirPath }, (err) => (err ? reject(err) : resolve()));
    });
}

async function zipTarget(absPath) {
    const st = await fsp.stat(absPath);
    const out = path.join(os.tmpdir(), `${path.basename(absPath)}-${Date.now()}.zip`);
    if (st.isDirectory()) {
        await zipDirectory(absPath, out);
        return out;
    }
    await new Promise((resolve, reject) => execFile('zip', ['-j', '-q', out, absPath], (err) => (err ? reject(err) : resolve())));
    return out;
}

function usage(prefix = '.') {
    return `📁 RGETFILE\n\n${prefix}rgetfile -c <file>\n${prefix}rgetfile -z <folder>\n${prefix}rgetfile <file>`;
}

export default {
    name: 'rgetfile',
    aliases: ['showfile'],
    category: 'owner',
    description: 'Read server file and send as doc or WhatsApp native code block',
    usage: 'rgetfile [-c|-z] <path>',
    cooldown: 2,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, prefix }) {
        const opt = parseArgs(args.join(' ').trim());
        if (!opt.target || opt.help) return sock.sendMessage(from, { text: usage(prefix) }, { quoted: message });

        const absPath = path.resolve(process.cwd(), opt.target);
        const st = await statSafe(absPath);
        if (!st) return sock.sendMessage(from, { text: `❌ Path not found:\n${absPath}` }, { quoted: message });

        let tempZip = null;
        try {
            if (opt.code) {
                if (st.isDirectory()) return sock.sendMessage(from, { text: '❌ Cannot render folder as code.' }, { quoted: message });
                if (st.size > CODE_MAX_BYTES) return sock.sendMessage(from, { text: '❌ File too large for code view. Use doc mode.' }, { quoted: message });

                const content = await fsp.readFile(absPath, 'utf8');
                const lang = opt.customLang || detectLang(path.basename(absPath));
                const blocks = tokenize(content, lang);

                return sock.relayMessage(from, {
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

            let sendPath = absPath;
            if (opt.zip || st.isDirectory()) {
                tempZip = await zipTarget(absPath);
                sendPath = tempZip;
            }

            const fileStat = await fsp.stat(sendPath);
            const maxBytes = Math.min(opt.maxMB, HARD_MAX_MB) * 1024 * 1024;
            if (fileStat.size > maxBytes) return sock.sendMessage(from, { text: `❌ File too large (> ${opt.maxMB}MB).` }, { quoted: message });

            const buffer = await fsp.readFile(sendPath);
            await sock.sendMessage(from, {
                document: buffer,
                fileName: opt.zip || st.isDirectory() ? `${path.basename(absPath)}.zip` : path.basename(absPath),
                mimetype: 'application/octet-stream',
                caption: `✅ Sent ${opt.target}`
            }, { quoted: message });
            return null;
        } finally {
            if (tempZip) await fsp.unlink(tempZip).catch(() => null);
        }
    }
};
