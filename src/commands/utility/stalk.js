function normalizeNum(value = '') {
    return String(value)
        .replace(/@s\.whatsapp\.net|@c\.us|@lid|:\d+/g, '')
        .replace(/[^0-9]/g, '');
}

function extractLidFromJid(jid = '') {
    const raw = String(jid || '');
    if (raw.endsWith('@lid')) return raw;
    if (raw.includes(':')) {
        const [base] = raw.split('@');
        if (base.includes(':')) return `${base}@lid`;
    }
    return 'Not available';
}

async function resolveTargetJid(sock, from, message, args) {
    const ctx = message.message?.extendedTextMessage?.contextInfo || {};
    const mention = ctx.mentionedJid?.[0];
    const participant = ctx.participant;
    const quotedParticipant = ctx?.quotedParticipant || ctx?.participant || '';
    const directMention = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || '';
    const input = mention || directMention || quotedParticipant || participant || args[0] || (message?.key?.participant || message?.key?.remoteJid || '');
    if (!input) return '';

    let raw = String(input);
    if (!raw.includes('@')) raw = `${normalizeNum(raw)}@s.whatsapp.net`;

    if (raw.endsWith('@lid') && from.endsWith('@g.us')) {
        try {
            const meta = await sock.groupMetadata(from);
            const base = raw.split('@')[0].split(':')[0];
            const found = (meta?.participants || []).find((p) => {
                const id = String(p?.id || '');
                return id.split('@')[0].split(':')[0] === base && id.endsWith('@s.whatsapp.net');
            });
            if (found?.id) raw = found.id;
        } catch {}
    }

    return raw;
}

export default {
    name: 'stalk',
    aliases: ['stalker', 'lookup'],
    category: 'utility',
    description: 'Lookup WhatsApp user or group metadata',
    usage: 'stalk @user OR stalk 234XXXXXXXXXX OR stalk group',
    cooldown: 3,

    async execute({ sock, message, args, from, isGroup }) {
        if ((args[0] || '').toLowerCase() === 'group') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ Use this in a group for group stalking.' }, { quoted: message });
            const meta = await sock.groupMetadata(from);
            return await sock.sendMessage(from, {
                text: `🕵️ *Group Stalker*\n\nName: ${meta.subject}\nJID: ${meta.id}\nMembers: ${meta.participants?.length || 0}\nCreated: ${meta.creation ? new Date(meta.creation * 1000).toLocaleString() : 'Unknown'}`
            }, { quoted: message });
        }

        const raw = await resolveTargetJid(sock, from, message, args);
        if (!raw || raw === '@s.whatsapp.net') {
            return await sock.sendMessage(from, { text: '❌ Mention/reply to a user or pass a number.' }, { quoted: message });
        }

        const [result] = await sock.onWhatsApp(raw).catch(() => []);
        const fallbackJid = `${normalizeNum(raw)}@s.whatsapp.net`;
        const finalResult = result?.exists ? result : { exists: true, jid: fallbackJid, biz: false };
        if (!finalResult?.jid || fallbackJid === '@s.whatsapp.net') {
            return await sock.sendMessage(from, { text: '❌ User not found on WhatsApp.' }, { quoted: message });
        }

        const targetJid = finalResult.jid;
        const resolvedLid = extractLidFromJid(raw) !== 'Not available'
            ? extractLidFromJid(raw)
            : extractLidFromJid(targetJid);
        let profilePic = null;
        let statusText = 'Unknown';
        let statusTime = 'Unknown';
        let name = targetJid.split('@')[0];
        try {
            const n = await sock.getName(targetJid);
            if (n) name = n;
        } catch {}
        try { profilePic = await sock.profilePictureUrl(targetJid, 'image'); } catch {}
        try {
            const fetched = await sock.fetchStatus(targetJid);
            if (fetched?.status) statusText = fetched.status;
            if (fetched?.setAt) statusTime = new Date(fetched.setAt).toLocaleString();
        } catch {}

        const caption = `🕵️ *User Stalker*\n\n👤 Name: ${name}\n🆔 JID: ${targetJid}\n📱 Number: +${targetJid.split('@')[0]}\n🧬 LID: ${resolvedLid}\n🏢 Business: ${finalResult.biz ? 'Yes' : 'No'}\n📝 Bio: ${statusText}\n🕒 Bio Updated: ${statusTime}\n✅ Status: Found`;

        if (profilePic) {
            return await sock.sendMessage(from, { image: { url: profilePic }, caption: `${caption}\n🖼️ DP: Available`, mentions: [targetJid] }, { quoted: message });
        }

        await sock.sendMessage(from, { text: `${caption}\n🖼️ DP: Not available`, mentions: [targetJid] }, { quoted: message });
    }
};
