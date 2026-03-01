import mongoose from 'mongoose';

export default {
    name: 'resetwarn',
    aliases: ['clearwarn', 'unwarn'],
    category: 'admin',
    description: 'Reset all warnings for a user',
    usage: 'resetwarn @user',
    example: 'resetwarn @user',
    cooldown: 3,
    permissions: ['admin'],
    args: false,
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from }) {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        const target = replied || mentioned[0];

        if (!target) {
            return await sock.sendMessage(from, {
                text: 'Mention or reply to a user to reset their warnings.'
            }, { quoted: message });
        }

        try {
            const WarnModel = mongoose.model('Warn');
            await WarnModel.findOneAndUpdate(
                { groupId: from, userId: target },
                { $set: { warns: [] } },
                { upsert: true }
            );

            await sock.sendMessage(from, {
                text: `Warnings cleared for @${target.split('@')[0]}.`,
                mentions: [target]
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, {
                text: 'Failed to reset warnings. Database error.'
            }, { quoted: message });
        }
    }
};
