export function normNum(jid) {
    return String(jid || '').replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '').split(':')[0].replace(/[^0-9]/g, '');
}

export function getTarget(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
    return replied || mentioned[0] || null;
}

export function botJid(sock) {
    const raw = sock.user?.id || '';
    const num = normNum(raw);
    return num ? `${num}@s.whatsapp.net` : null;
}

export async function getParticipant(sock, groupJid, userJid) {
    const meta = await sock.groupMetadata(groupJid);
    const num = normNum(userJid);
    return meta.participants.find(p => normNum(p.id) === num) || null;
}

export async function getMeta(sock, groupJid) {
    return await sock.groupMetadata(groupJid);
}
