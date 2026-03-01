import { normNum, getTarget } from '../../utils/adminUtils.js';
import fs from 'fs-extra';
import path from 'path';

const BAN_FILE = path.join(process.cwd(), 'data', 'bans.json');

async function loadBans() { try { await fs.ensureDir(path.dirname(BAN_FILE)); return await fs.readJSON(BAN_FILE); } catch { return {}; } }
async function saveBans(d) { try { await fs.ensureDir(path.dirname(BAN_FILE)); await fs.writeJSON(BAN_FILE, d, { spaces: 2 }); } catch {} }

export default {
    name: 'unban',
    aliases: ['removeban'],
    category: 'admin',
    description: 'Unban a user so they can rejoin the group',
    usage: 'unban @user',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, args }) {
        const target = getTarget(message);
        const rawNum = args.find(a => !a.startsWith('@') && /^[0-9]+$/.test(a));
        const num = target ? normNum(target) : rawNum;

        if (!num) return await sock.sendMessage(from, { text: '❌ Mention, reply to, or provide the number of the user to unban.' }, { quoted: message });

        const bans = await loadBans();
        if (!bans[from]?.[num]) return await sock.sendMessage(from, { text: `❌ +${num} is not banned in this group.` }, { quoted: message });

        delete bans[from][num];
        await saveBans(bans);
        await sock.sendMessage(from, { text: `✅ +${num} has been unbanned and can rejoin the group.` }, { quoted: message });
    }
};
