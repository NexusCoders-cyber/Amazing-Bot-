export function normalizeJidToNumber(jid, sock) {
    if (!jid) return '';
    return String(jid)
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
}
