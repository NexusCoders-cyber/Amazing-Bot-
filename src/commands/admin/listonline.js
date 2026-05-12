export default {
    name: 'listonline',
    aliases: ['online', 'whoonline'],
    category: 'admin',
    description: 'List currently known online members (best-effort)',
    usage: 'listonline',
    groupOnly: true,

    async execute({ sock, message, from }) {
        const meta = await sock.groupMetadata(from);
        const participants = meta.participants || [];
        const knownOnline = participants.filter(p => p.presence === 'available' || p.presence === 'composing' || p.presence === 'recording');
        const list = (knownOnline.length ? knownOnline : participants.slice(0, 20)).map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n');
        await sock.sendMessage(from, {
            text: `🟢 *Online Members (best effort)*\n\n${list}\n\n${knownOnline.length ? '' : 'ℹ️ WhatsApp presence is limited; this is an approximate list.'}`,
            mentions: (knownOnline.length ? knownOnline : participants.slice(0, 20)).map(p => p.id)
        }, { quoted: message });
    }
};
