import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'antiword.json');

async function load() { try { await fs.ensureDir(path.dirname(FILE)); return await fs.readJSON(FILE); } catch { return {}; } }
async function save(d) { try { await fs.ensureDir(path.dirname(FILE)); await fs.writeJSON(FILE, d, { spaces: 2 }); } catch {} }

export async function checkBadWord(sock, message) {
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

    try {
        await sock.sendMessage(from, {
            delete: { remoteJid: from, id: message.key.id, fromMe: false, participant: sender }
        });
    } catch {}

    await sock.sendMessage(from, {
        text: `⚠️ @${sender.split('@')[0].split(':')[0]} that word is not allowed here.`,
        mentions: [sender]
    });

    return true;
}

export default {
    name: 'antiword',
    aliases: ['wordfilter', 'badword'],
    category: 'admin',
    description: 'Filter and delete messages containing banned words',
    usage: 'antiword <on|off|add|remove|list|clear> [word]',
    example: 'antiword on\nantiword add badword\nantiword remove badword\nantiword list',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, args }) {
        const action = args[0]?.toLowerCase();
        const data = await load();
        if (!data[from]) data[from] = { enabled: false, words: [] };
        const cfg = data[from];

        if (action === 'on') {
            cfg.enabled = true;
            await save(data);
            return await sock.sendMessage(from, { text: '✅ Word filter enabled.' }, { quoted: message });
        }
        if (action === 'off') {
            cfg.enabled = false;
            await save(data);
            return await sock.sendMessage(from, { text: '❌ Word filter disabled.' }, { quoted: message });
        }
        if (action === 'list') {
            return await sock.sendMessage(from, {
                text: cfg.words.length
                    ? `🚫 Banned words (${cfg.words.length}):\n\n${cfg.words.join(', ')}`
                    : '✅ No banned words set.'
            }, { quoted: message });
        }
        if (action === 'clear') {
            cfg.words = [];
            await save(data);
            return await sock.sendMessage(from, { text: '✅ All banned words cleared.' }, { quoted: message });
        }
        if (action === 'add') {
            const word = args.slice(1).join(' ').toLowerCase().trim();
            if (!word) return await sock.sendMessage(from, { text: '❌ Provide a word to add.' }, { quoted: message });
            if (cfg.words.includes(word)) return await sock.sendMessage(from, { text: `❌ "${word}" is already in the list.` }, { quoted: message });
            cfg.words.push(word);
            await save(data);
            return await sock.sendMessage(from, { text: `✅ Added "${word}" to banned words.` }, { quoted: message });
        }
        if (action === 'remove') {
            const word = args.slice(1).join(' ').toLowerCase().trim();
            if (!word) return await sock.sendMessage(from, { text: '❌ Provide a word to remove.' }, { quoted: message });
            const idx = cfg.words.indexOf(word);
            if (idx === -1) return await sock.sendMessage(from, { text: `❌ "${word}" is not in the list.` }, { quoted: message });
            cfg.words.splice(idx, 1);
            await save(data);
            return await sock.sendMessage(from, { text: `✅ Removed "${word}" from banned words.` }, { quoted: message });
        }

        await sock.sendMessage(from, {
            text: `🚫 Word Filter\n\nStatus: ${cfg.enabled ? '✅ On' : '❌ Off'}\nWords: ${cfg.words.length}\n\nCommands:\nantiword on|off\nantiword add <word>\nantiword remove <word>\nantiword list\nantiword clear`
        }, { quoted: message });
    }
};
