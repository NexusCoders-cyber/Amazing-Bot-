import fs from 'fs-extra';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'antileave.json');

async function load() { try { await fs.ensureDir(path.dirname(FILE)); return await fs.readJSON(FILE); } catch { return {}; } }
async function save(d) { try { await fs.ensureDir(path.dirname(FILE)); await fs.writeJSON(FILE, d, { spaces: 2 }); } catch {} }

export async function isAntiLeaveEnabled(groupId) {
    const data = await load();
    return !!data[groupId]?.enabled;
}

export default {
    name: 'antileave',
    aliases: ['lockleave', 'noleave'],
    category: 'admin',
    description: 'Auto re-add anyone who tries to leave the group',
    usage: 'antileave <on|off|status>',
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
                text: '✅ Antileave enabled. Anyone who leaves will be re-added.'
            }, { quoted: message });
        }

        if (action === 'off') {
            data[from].enabled = false;
            await save(data);
            return await sock.sendMessage(from, {
                text: '❌ Antileave disabled.'
            }, { quoted: message });
        }

        return await sock.sendMessage(from, {
            text: `🔒 *Antileave*\n\n• antileave on — enable\n• antileave off — disable\n• antileave status — check\n\nStatus: ${data[from].enabled ? '✅ On' : '❌ Off'}`
        }, { quoted: message });
    }
};
