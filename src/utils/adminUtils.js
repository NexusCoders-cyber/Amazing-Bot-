export function normNum(jid) {
    if (!jid) return '';
    const s = String(jid);
    if (s.endsWith('@lid')) return '';
    return s
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
}

export function getBotNums(sock) {
    const nums = new Set();
    const candidates = [
        sock.user?.id,
        sock.user?.lid,
        sock.authState?.creds?.me?.id,
        sock.authState?.creds?.me?.lid,
    ];
    for (const c of candidates) {
        if (!c) continue;
        const s = String(c);
        if (s.endsWith('@lid')) continue;
        const n = s
            .replace(/@s\.whatsapp\.net|@c\.us/g, '')
            .split(':')[0]
            .replace(/[^0-9]/g, '');
        if (n) nums.add(n);
    }
    return nums;
}

export function botJid(sock) {
    const nums = getBotNums(sock);
    const num = [...nums][0] || '';
    return num ? num + '@s.whatsapp.net' : '';
}

export function getTarget(message) {
    const ctx = message?.message?.extendedTextMessage?.contextInfo || message?.message?.imageMessage?.contextInfo || message?.message?.videoMessage?.contextInfo || {};
    const mentioned = Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid : [];
    const replied = ctx?.participant || ctx?.remoteJid || '';
    return replied || mentioned[0] || null;
}

export async function getMeta(sock, groupJid) {
    try {
        return await sock.groupMetadata(groupJid);
    } catch {
        return null;
    }
}

export async function getParticipant(sock, groupJid, userJid) {
    const meta = await getMeta(sock, groupJid);
    if (!meta?.participants) return null;
    const userNum = normNum(userJid);
    if (!userNum) return null;
    return meta.participants.find(p => normNum(p.id) === userNum) || null;
}

export async function isBotAdmin(sock, groupJid) {
    try {
        const meta = await getMeta(sock, groupJid);
        if (!meta?.participants) return false;
        const botNums = getBotNums(sock);
        if (!botNums.size) return false;
        const bot = meta.participants.find(p => {
            const pNum = normNum(p.id);
            return pNum && botNums.has(pNum);
        });
        if (bot) return !!(bot.admin);
        const botLidRaw = sock.user?.lid || sock.authState?.creds?.me?.lid || '';
        if (botLidRaw) {
            const botLid = String(botLidRaw).split('@')[0].split(':')[0];
            const byLid = meta.participants.find(p => {
                return String(p.id || '').split('@')[0].split(':')[0] === botLid;
            });
            if (byLid) return !!(byLid.admin);
        }
        return false;
    } catch {
        return false;
    }
}
