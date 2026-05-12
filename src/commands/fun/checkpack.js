const CHECKS = ['smartcheck', 'greatcheckcase', 'stupidcheck', 'uncleancheck', 'hotcheck', 'gaycheck', 'waifucheck', 'evilcheck', 'dogcheck', 'coolcheck'];

function getBody(message) {
    return message?.message?.conversation
        || message?.message?.extendedTextMessage?.text
        || message?.message?.imageMessage?.caption
        || message?.message?.videoMessage?.caption
        || '';
}

function getInvoked(message, prefix, fallback) {
    const body = getBody(message).trim();
    if (!body || !body.startsWith(prefix)) return fallback;
    return body.slice(prefix.length).split(/\s+/)[0].toLowerCase() || fallback;
}

function getArgTarget(message, prefix) {
    const body = getBody(message).trim();
    if (!body.startsWith(prefix)) return '';
    const parts = body.slice(prefix.length).trim().split(/\s+/);
    const targetRaw = parts[1] || '';
    const digits = targetRaw.replace(/[^0-9]/g, '');
    if (digits.length >= 10) return `${digits}@s.whatsapp.net`;
    return '';
}

function getTargetUser(message, sender, prefix) {
    const ctx = message?.message?.extendedTextMessage?.contextInfo
        || message?.message?.imageMessage?.contextInfo
        || message?.message?.videoMessage?.contextInfo
        || {};

    const mentioned = ctx?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];
    if (ctx?.participant) return ctx.participant;

    const argTarget = getArgTarget(message, prefix);
    if (argTarget) return argTarget;

    return sender || message?.key?.participant || message?.key?.remoteJid;
}

export default {
    name: 'smartcheck',
    aliases: CHECKS.filter((c) => c !== 'smartcheck'),
    category: 'fun',
    description: 'Random percent fun checks',
    usage: 'smartcheck [@user]',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, prefix, sender }) {
        const invoked = getInvoked(message, prefix, 'smartcheck');
        const selected = CHECKS.includes(invoked) ? invoked : 'smartcheck';
        const percent = Math.floor(Math.random() * 101);
        const targetUser = getTargetUser(message, sender, prefix);
        const label = selected.replace('check', '');

        await sock.sendMessage(from, {
            text: `*${selected.toUpperCase()}*\n@${targetUser.split('@')[0]} is ${percent}% ${label}`,
            mentions: [targetUser]
        }, { quoted: message });
    }
};
