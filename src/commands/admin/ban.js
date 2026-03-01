import { normNum, getTarget, botJid, getParticipant, getMeta } from '../../utils/adminUtils.js';
import fs from 'fs-extra';
import path from 'path';

const BAN_FILE = path.join(process.cwd(), 'data', 'bans.json');

async function loadBans() { try { await fs.ensureDir(path.dirname(BAN_FILE)); return await fs.readJSON(BAN_FILE); } catch { return {}; } }
async function saveBans(d) { try { await fs.ensureDir(path.dirname(BAN_FILE)); await fs.writeJSON(BAN_FILE, d, { spaces: 2 }); } catch {} }

export async function isBanned(groupId, userId) {
    const bans = await loadBans();
    return !!(bans[groupId]?.[normNum(userId)]);
}

export async function checkBan(sock, message) {
    const from = message.key.remoteJid;
    if (!from?.endsWith('@g.us')) return false;
    if (message.key.fromMe) return false;
    const sender = message.key.participant || message.key.remoteJid;
    if (!sender) return false;
    if (await isBanned(from, sender)) {
        try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove');
        } catch {}
        return true;
    }
    return false;
}

export default {
    name: 'ban',
    aliases: ['softban'],
    category: 'admin',
    description: 'Ban a user — kicks them and prevents re-entry',
    usage: 'ban @user [reason]',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender, args }) {
        const target = getTarget(message);
        if (!target) return await sock.sendMessage(from, { text: '❌ Mention or reply to a user to ban.' }, { quoted: message });

        const bot = botJid(sock);
        if (normNum(target) === normNum(bot)) return await sock.sendMessage(from, { text: "❌ I can't ban myself." }, { quoted: message });
        if (normNum(target) === normNum(sender)) return await sock.sendMessage(from, { text: "❌ You can't ban yourself." }, { quoted: message });

        const reason = args.filter(a => !a.startsWith('@')).join(' ') || 'No reason provided';

        try {
            const p = await getParticipant(sock, from, target);
            if (!p) return await sock.sendMessage(from, { text: '❌ User is not in this group.' }, { quoted: message });
            if (p.admin === 'superadmin') return await sock.sendMessage(from, { text: "❌ Can't ban the group creator." }, { quoted: message });

            const bans = await loadBans();
            if (!bans[from]) bans[from] = {};
            bans[from][normNum(p.id)] = { reason, bannedBy: normNum(sender), timestamp: Date.now() };
            await saveBans(bans);

            await sock.groupParticipantsUpdate(from, [p.id], 'remove');
            await sock.sendMessage(from, {
                text: `🚫 @${normNum(p.id)} has been banned.\nReason: ${reason}`,
                mentions: [p.id]
            }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(from, {
                text: err.message?.includes('not-authorized') || err.message?.includes('forbidden')
                    ? '❌ Failed: Bot lacks admin permission.'
                    : `❌ Failed: ${err.message}`
            }, { quoted: message });
        }
    }
};
