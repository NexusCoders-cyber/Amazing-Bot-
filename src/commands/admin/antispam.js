import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'antispam.json');
const msgTracker = new Map();

async function load() { try { await fs.ensureDir(path.dirname(FILE)); return await fs.readJSON(FILE); } catch { return {}; } }
async function save(d) { try { await fs.ensureDir(path.dirname(FILE)); await fs.writeJSON(FILE, d, { spaces: 2 }); } catch {} }

export async function checkSpam(sock, message) {
    const from = message.key.remoteJid;
    if (!from?.endsWith('@g.us') || message.key.fromMe) return false;
    const settings = await load();
    const cfg = settings[from];
    if (!cfg?.enabled) return false;

    const sender = message.key.participant || message.key.remoteJid;
    const key = `${from}_${sender}`;
    const now = Date.now();
    const windowMs = (cfg.windowSeconds || 5) * 1000;
    const maxMsgs = cfg.maxMessages || 5;

    let track = msgTracker.get(key) || { count: 0, start: now };
    if (now - track.start > windowMs) track = { count: 0, start: now };
    track.count++;
    msgTracker.set(key, track);

    if (track.count > maxMsgs) {
        try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
        msgTracker.delete(key);
        try {
            await sock.sendMessage(from, {
                text: `⚡ @${sender.split('@')[0].split(':')[0]} was removed for spamming.`,
                mentions: [sender]
            });
        } catch {}
        return true;
    }
    return false;
}

export default {
    name: 'antispam',
    aliases: ['nospam', 'spamprotect'],
    category: 'admin',
    description: 'Toggle auto-kick for members who spam messages too fast',
    usage: 'antispam <on|off|status> [maxMsgs] [windowSeconds]',
    example: 'antispam on\nantispam on 5 3',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, args }) {
        const action = args[0]?.toLowerCase();
        const data = await load();

        if (action === 'status' || action === 'check') {
            const cfg = data[from];
            return await sock.sendMessage(from, {
                text: `⚡ Anti-Spam\n\nStatus: ${cfg?.enabled ? '✅ Enabled' : '❌ Disabled'}${cfg?.enabled ? `\nMax msgs: ${cfg.maxMessages || 5} per ${cfg.windowSeconds || 5}s` : ''}`
            }, { quoted: message });
        }

        if (!['on', 'off'].includes(action)) {
            return await sock.sendMessage(from, { text: '❌ Usage: antispam on|off|status' }, { quoted: message });
        }

        const enabled = action === 'on';
        const maxMessages = parseInt(args[1]) || 5;
        const windowSeconds = parseInt(args[2]) || 5;
        data[from] = { enabled, maxMessages, windowSeconds };
        await save(data);

        await sock.sendMessage(from, {
            text: `⚡ Anti-Spam ${enabled ? '✅ Enabled' : '❌ Disabled'}${enabled ? `\nSettings: ${maxMessages} messages per ${windowSeconds} seconds` : ''}`
        }, { quoted: message });
    }
};
