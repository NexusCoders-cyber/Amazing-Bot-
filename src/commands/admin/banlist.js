import { normNum } from '../../utils/adminUtils.js';
import fs from 'fs-extra';
import path from 'path';

const BAN_FILE = path.join(process.cwd(), 'data', 'bans.json');

async function loadBans() { try { await fs.ensureDir(path.dirname(BAN_FILE)); return await fs.readJSON(BAN_FILE); } catch { return {}; } }

export default {
    name: 'banlist',
    aliases: ['bans', 'banned'],
    category: 'admin',
    description: 'List all banned users in this group',
    usage: 'banlist',
    cooldown: 5,
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from }) {
        const bans = await loadBans();
        const groupBans = bans[from];
        if (!groupBans || !Object.keys(groupBans).length) {
            return await sock.sendMessage(from, { text: '✅ No banned users in this group.' }, { quoted: message });
        }

        const lines = Object.entries(groupBans).map(([num, data]) => {
            const date = new Date(data.timestamp).toLocaleDateString('en-US');
            return `+${num} — ${data.reason} (${date})`;
        });

        await sock.sendMessage(from, {
            text: `🚫 *Banned Users* (${lines.length})\n\n${lines.join('\n')}`
        }, { quoted: message });
    }
};
