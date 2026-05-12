import fs from 'fs-extra';
import path from 'path';
import { setSuspend, clearSuspend } from '../../utils/suspendStore.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = path.join(process.cwd(), 'data', 'antigay.json');

const DEFAULT_WORDS = [
    'im gay', "i'm gay", 'iamgay', 'i am gay',
    'im gay', 'igay', 'm gay',
    'i like boys', 'i like man', 'i love man',
    'sucking', 'blowjob', 'cock', 'dick',
    'faggot', 'fag', 'homo', 'homosexual',
    'i am bisexual', 'imbisexual', 'lgbtq'
];

async function load() {
    try {
        await fs.ensureDir(path.dirname(FILE));
        return await fs.readJSON(FILE);
    } catch { return {}; }
}
async function save(d) {
    try { await fs.ensureDir(path.dirname(FILE)); await fs.writeJSON(FILE, d, { spaces: 2 }); } catch {}
}

export async function checkGay(sock, message) {
    const from = message.key.remoteJid;
    if (!from?.endsWith('@g.us') || message.key.fromMe) return false;
    const data = await load();
    const cfg = data[from];
    if (!cfg?.enabled || !cfg.words?.length) return false;

    const sender = message.key.participant || message.key.remoteJid;
    const msg = message.message;
    const text = (msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || '').toLowerCase();
    if (!text) return false;

    const found = cfg.words.find(w => text.includes(w.toLowerCase()));
    if (!found) return false;

    try {
        const meta = await sock.groupMetadata(from);
        const normalizedSender = sender.split(':')[0].split('@')[0];
        const participant = meta.participants.find(p => p.id.split(':')[0].split('@')[0] === normalizedSender);
        if (participant?.admin) return false;
    } catch {}

    // Delete message
    try {
        await sock.sendMessage(from, {
            delete: { remoteJid: from, id: message.key.id, fromMe: false, participant: sender }
        });
    } catch {}

    // Suspend user for 24h
    const durationMs = (cfg.suspendHours || 24) * 60 * 60 * 1000;
    await setSuspend(from, sender, Date.now() + durationMs);

    await sock.sendMessage(from, {
        text: `🚫 @${sender.split('@')[0].split(':')[0]} detected & suspended for ${cfg.suspendHours || 24}h.`,
        mentions: [sender]
    });

    return true;
}

export default {
    name: 'antigay',
    aliases: ['nogay', 'gayfilter'],
    category: 'admin',
    description: 'Auto-detect, delete & suspend users for gay content',
    usage: 'antigay <on|off|add|remove|list|clear|time> [value]',
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, args }) {
        const action = args[0]?.toLowerCase();
        const data = await load();
        if (!data[from]) data[from] = { enabled: false, words: [...DEFAULT_WORDS], suspendHours: 24 };
        const cfg = data[from];

        if (action === 'on') {
            cfg.enabled = true;
            cfg.words = cfg.words?.length ? cfg.words : [...DEFAULT_WORDS];
            await save(data);
            return await sock.sendMessage(from, {
                text: `✅ Antigay enabled. ${cfg.words.length} patterns active. Suspension: ${cfg.suspendHours}h.`
            }, { quoted: message });
        }

        if (action === 'off') {
            cfg.enabled = false;
            await save(data);
            return await sock.sendMessage(from, { text: '❌ Antigay disabled.' }, { quoted: message });
        }

        if (action === 'add') {
            const word = args.slice(1).join(' ').trim().toLowerCase();
            if (!word) return await sock.sendMessage(from, { text: '❌ Provide a word to add.' }, { quoted: message });
            if (!cfg.words) cfg.words = [...DEFAULT_WORDS];
            if (cfg.words.includes(word)) return await sock.sendMessage(from, { text: '⚠️ Already in list.' }, { quoted: message });
            cfg.words.push(word);
            await save(data);
            return await sock.sendMessage(from, { text: `✅ Added: "${word}"\nTotal: ${cfg.words.length} patterns` }, { quoted: message });
        }

        if (action === 'remove') {
            const word = args.slice(1).join(' ').trim().toLowerCase();
            if (!word) return await sock.sendMessage(from, { text: '❌ Provide a word to remove.' }, { quoted: message });
            const idx = cfg.words?.indexOf(word);
            if (idx === -1 || idx === undefined) return await sock.sendMessage(from, { text: '⚠️ Not found in list.' }, { quoted: message });
            cfg.words.splice(idx, 1);
            await save(data);
            return await sock.sendMessage(from, { text: `✅ Removed: "${word}"\nRemaining: ${cfg.words.length} patterns` }, { quoted: message });
        }

        if (action === 'list') {
            const words = cfg.words || DEFAULT_WORDS;
            return await sock.sendMessage(from, {
                text: `🚫 *Antigay Patterns (${words.length})*\n\n${words.join(', ')}\n\n⏱ Suspension: ${cfg.suspendHours || 24}h\nStatus: ${cfg.enabled ? '✅ On' : '❌ Off'}`
            }, { quoted: message });
        }

        if (action === 'clear') {
            cfg.words = [...DEFAULT_WORDS];
            await save(data);
            return await sock.sendMessage(from, { text: `✅ Reset to ${DEFAULT_WORDS.length} default patterns.` }, { quoted: message });
        }

        if (action === 'time') {
            const val = parseInt(args[1], 10);
            if (!val || val < 1 || val > 720) return await sock.sendMessage(from, { text: '❌ Set hours: antigay time 24 (1-720h)' }, { quoted: message });
            cfg.suspendHours = val;
            await save(data);
            return await sock.sendMessage(from, { text: `✅ Suspension duration set to ${val}h.` }, { quoted: message });
        }

        return await sock.sendMessage(from, {
            text: `🚫 *Antigay Commands*\n\n` +
                  `• antigay on — enable\n` +
                  `• antigay off — disable\n` +
                  `• antigay add <word> — add pattern\n` +
                  `• antigay remove <word> — remove pattern\n` +
                  `• antigay list — view all patterns\n` +
                  `• antigay clear — reset to defaults\n` +
                  `• antigay time <hours> — set suspension duration\n\n` +
                  `Status: ${cfg.enabled ? '✅ On' : '❌ Off'}\n` +
                  `Patterns: ${(cfg.words || DEFAULT_WORDS).length}\n` +
                  `Suspension: ${cfg.suspendHours || 24}h`
        }, { quoted: message });
    }
};
