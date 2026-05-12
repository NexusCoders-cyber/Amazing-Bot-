import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'antisticker.json');

async function load() { try { await fs.ensureDir(path.dirname(FILE)); return await fs.readJSON(FILE); } catch { return {}; } }
async function save(d) { try { await fs.ensureDir(path.dirname(FILE)); await fs.writeJSON(FILE, d, { spaces: 2 }); } catch {} }

export async function checkSticker(sock, message) {
    const from = message.key.remoteJid;
    if (!from?.endsWith('@g.us') || message.key.fromMe) return false;
    if (!message.message?.stickerMessage) return false;

    const data = await load();
    const cfg = data[from];
    if (!cfg?.enabled) return false;

    const sender = message.key.participant || message.key.remoteJid;

    // Skip admins
    try {
        const meta = await sock.groupMetadata(from);
        const normalizedSender = sender.split(':')[0].split('@')[0];
        const participant = meta.participants.find(p => p.id.split(':')[0].split('@')[0] === normalizedSender);
        if (participant?.admin) return false;
    } catch {}

    // Delete the sticker
    try {
        await sock.sendMessage(from, {
            delete: { remoteJid: from, id: message.key.id, fromMe: false, participant: sender }
        });
    } catch {}

    // Warn silently
    try {
        await sock.sendMessage(from, {
            text: `🚫 @${sender.split('@')[0].split(':')[0]} stickers are not allowed here.`,
            mentions: [sender]
        });
    } catch {}

    return true;
}

export default {
    name: 'antisticker',
    aliases: ['stickerfilter', 'nosticker', 'blocksticker'],
    category: 'admin',
    description: 'Auto-delete all stickers sent in the group',
    usage: 'antisticker <on|off|status>',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, args }) {
        const action = args[0]?.toLowerCase();
        const data = await load();
        if (!data[from]) data[from] = { enabled: false };

        if (action === 'on') {
            data[from].enabled = true;
            await save(data);
            return await sock.sendMessage(from, {
                text: '✅ Sticker filter enabled. All stickers will be deleted.'
            }, { quoted: message });
        }

        if (action === 'off') {
            data[from].enabled = false;
            await save(data);
            return await sock.sendMessage(from, {
                text: '❌ Sticker filter disabled.'
            }, { quoted: message });
        }

        if (action === 'status') {
            return await sock.sendMessage(from, {
                text: `🚫 *Anti-Sticker Status*\n\n${data[from].enabled ? '✅ Enabled' : '❌ Disabled'}`
            }, { quoted: message });
        }

        return await sock.sendMessage(from, {
            text: `🚫 *Anti-Sticker*\n\n` +
                  `• antisticker on — enable (delete all stickers)\n` +
                  `• antisticker off — disable\n` +
                  `• antisticker status — check status\n\n` +
                  `Status: ${data[from].enabled ? '✅ On' : '❌ Off'}`
        }, { quoted: message });
    }
};
