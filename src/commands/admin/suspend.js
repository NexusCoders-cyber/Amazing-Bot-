import { setSuspend, clearSuspend } from '../../utils/suspendStore.js';

function parseDurationMs(text) {
    const cleaned = String(text || '').trim().toLowerCase();
    const match = cleaned.match(/^(\d+)\s*([a-z]+)?$/i);
    if (!match) return null;
    const n = parseInt(match[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = match[2] || 'm';
    if (/^(s|sec|secs|second|seconds)$/.test(unit)) return n * 1000;
    if (/^(m|min|mins|minute|minutes)$/.test(unit)) return n * 60 * 1000;
    if (/^(h|hr|hrs|hour|hours)$/.test(unit)) return n * 60 * 60 * 1000;
    if (/^(d|day|days)$/.test(unit)) return n * 24 * 60 * 60 * 1000;
    if (/^(w|wk|week|weeks)$/.test(unit)) return n * 7 * 24 * 60 * 60 * 1000;
    return null;
}

export default {
    name: 'suspend',
    aliases: ['tempsilence'],
    category: 'admin',
    description: 'Temporarily delete a user messages in group for specified time',
    usage: 'suspend @user 30 minutes | suspend @user stop',
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, args }) {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        const target = replied || mentioned[0];
        if (!target) return await sock.sendMessage(from, { text: '❌ Mention or reply a user.' }, { quoted: message });

        const action = (args.slice(1).join(' ') || '').trim().toLowerCase();
        if (!action) return await sock.sendMessage(from, { text: '❌ Provide duration. Example: suspend @user 30 minutes' }, { quoted: message });

        if (action === 'stop') {
            await clearSuspend(from, target);
            return await sock.sendMessage(from, { text: `✅ Suspension stopped for @${target.split('@')[0]}`, mentions: [target] }, { quoted: message });
        }

        const durationMs = parseDurationMs(action);
        if (!durationMs || durationMs < 1_000) {
            return await sock.sendMessage(from, { text: '❌ Invalid duration. Examples: 30s, 15m, 2h, 1d, 1w.' }, { quoted: message });
        }

        const until = Date.now() + durationMs;
        await setSuspend(from, target, until);
        await sock.sendMessage(from, {
            text: `✅ Suspended @${target.split('@')[0]} for ${action}. Their new messages will be deleted until stop/time ends.`,
            mentions: [target]
        }, { quoted: message });
    }
};
