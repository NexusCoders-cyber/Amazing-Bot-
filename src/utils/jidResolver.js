function normalizeBase(jid = '') {
    return String(jid || '').split('@')[0].split(':')[0].trim();
}

function normalizePhone(jid = '') {
    const value = String(jid || '')
        .replace(/@s\.whatsapp\.net|@c\.us|@g\.us|@broadcast|@lid/g, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
    return value.length >= 7 ? value : '';
}

export async function resolveJidFromMentionOrReply({ sock, message, from }) {
    const contextInfo = message.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = contextInfo.mentionedJid || [];
    const quotedParticipant = contextInfo.participant;

    const rawTarget = quotedParticipant || mentioned[0] || '';
    if (!rawTarget) return '';
    if (!String(rawTarget).endsWith('@lid')) return rawTarget;

    if (!from?.endsWith('@g.us')) return rawTarget;

    try {
        const metadata = await sock.groupMetadata(from);
        const participants = metadata?.participants || [];
        const targetBase = normalizeBase(rawTarget);

        const byBase = participants.find((p) => normalizeBase(p?.id) === targetBase && String(p?.id || '').endsWith('@s.whatsapp.net'));
        if (byBase?.id) return byBase.id;

        const mentionBases = mentioned.map((jid) => normalizeBase(jid)).filter(Boolean);
        const byMention = participants.find((p) => mentionBases.includes(normalizeBase(p?.id)) && String(p?.id || '').endsWith('@s.whatsapp.net'));
        if (byMention?.id) return byMention.id;
    } catch {}

    return rawTarget;
}

export function extractNumberOrLid(jid = '') {
    return normalizePhone(jid) || normalizeBase(jid);
}

export function toMentionJid(raw = '') {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (value.includes('@')) return value;
    return `${value}@s.whatsapp.net`;
}
