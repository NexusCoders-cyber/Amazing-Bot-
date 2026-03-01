import mongoose from 'mongoose';

const warnSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    userId: { type: String, required: true },
    warns: [{
        reason: String,
        warnedBy: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

warnSchema.index({ groupId: 1, userId: 1 }, { unique: true });

let WarnModel;
try {
    WarnModel = mongoose.model('Warn');
} catch {
    WarnModel = mongoose.model('Warn', warnSchema);
}

const MAX_WARNS = 3;

async function getWarns(groupId, userId) {
    try {
        const doc = await WarnModel.findOne({ groupId, userId });
        return doc?.warns || [];
    } catch {
        return [];
    }
}

async function addWarn(groupId, userId, reason, warnedBy) {
    try {
        const doc = await WarnModel.findOneAndUpdate(
            { groupId, userId },
            { $push: { warns: { reason, warnedBy } } },
            { upsert: true, new: true }
        );
        return doc.warns.length;
    } catch {
        return 0;
    }
}

async function resetWarns(groupId, userId) {
    try {
        await WarnModel.findOneAndUpdate({ groupId, userId }, { $set: { warns: [] } }, { upsert: true });
        return true;
    } catch {
        return false;
    }
}

async function getAllWarns(groupId) {
    try {
        return await WarnModel.find({ groupId });
    } catch {
        return [];
    }
}

export default {
    name: 'warn',
    aliases: ['w'],
    category: 'admin',
    description: 'Warn a group member. After 3 warns they get kicked',
    usage: 'warn @user [reason]',
    example: 'warn @user spamming',
    cooldown: 3,
    permissions: ['admin'],
    args: false,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender, args, isOwner, isSudo }) {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        const target = replied || mentioned[0];

        if (!target) {
            return await sock.sendMessage(from, {
                text: 'Mention or reply to a user to warn them.'
            }, { quoted: message });
        }

        const botJid = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
        if (target === botJid) {
            return await sock.sendMessage(from, { text: 'Cannot warn myself.' }, { quoted: message });
        }

        if (target === sender && !isOwner && !isSudo) {
            return await sock.sendMessage(from, { text: 'Cannot warn yourself.' }, { quoted: message });
        }

        const reason = args.filter(a => !a.includes('@')).join(' ') || 'No reason provided';
        const warnCount = await addWarn(from, target, reason, sender);
        const targetNum = target.split('@')[0];

        if (warnCount >= MAX_WARNS) {
            try {
                await sock.groupParticipantsUpdate(from, [target], 'remove');
                await sock.sendMessage(from, {
                    text: `@${targetNum} has been kicked after receiving ${MAX_WARNS} warnings.\nLast reason: ${reason}`,
                    mentions: [target]
                }, { quoted: message });
                await resetWarns(from, target);
            } catch {
                await sock.sendMessage(from, {
                    text: `@${targetNum} has reached ${MAX_WARNS} warnings but could not be kicked. Check bot admin status.`,
                    mentions: [target]
                }, { quoted: message });
            }
        } else {
            await sock.sendMessage(from, {
                text: `@${targetNum} has been warned.\nReason: ${reason}\nWarnings: ${warnCount}/${MAX_WARNS}`,
                mentions: [target]
            }, { quoted: message });
        }
    }
};
