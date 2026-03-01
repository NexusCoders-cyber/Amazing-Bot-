import mongoose from 'mongoose';

async function getWarns(groupId, userId) {
    try {
        const WarnModel = mongoose.model('Warn');
        const doc = await WarnModel.findOne({ groupId, userId });
        return doc?.warns || [];
    } catch {
        return [];
    }
}

async function getAllWarns(groupId) {
    try {
        const WarnModel = mongoose.model('Warn');
        return await WarnModel.find({ groupId, 'warns.0': { $exists: true } });
    } catch {
        return [];
    }
}

export default {
    name: 'warns',
    aliases: ['warnlist', 'checkwarn'],
    category: 'admin',
    description: 'Check warnings for a user or list all warnings in group',
    usage: 'warns [@user]',
    example: 'warns @user',
    cooldown: 5,
    permissions: ['admin'],
    args: false,
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, args }) {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
        const target = replied || mentioned[0];

        if (target) {
            const warns = await getWarns(from, target);
            const targetNum = target.split('@')[0];

            if (!warns.length) {
                return await sock.sendMessage(from, {
                    text: `@${targetNum} has no warnings.`,
                    mentions: [target]
                }, { quoted: message });
            }

            let text = `Warnings for @${targetNum} (${warns.length}/3):\n\n`;
            warns.forEach((w, i) => {
                const date = new Date(w.timestamp).toLocaleDateString();
                text += `${i + 1}. ${w.reason} (${date})\n`;
            });

            return await sock.sendMessage(from, {
                text,
                mentions: [target]
            }, { quoted: message });
        }

        const allWarns = await getAllWarns(from);

        if (!allWarns.length) {
            return await sock.sendMessage(from, {
                text: 'No warnings in this group.'
            }, { quoted: message });
        }

        const mentions = [];
        let text = `All warnings in this group:\n\n`;

        for (const doc of allWarns) {
            const num = doc.userId.split('@')[0];
            text += `@${num}: ${doc.warns.length}/3 warns\n`;
            mentions.push(doc.userId);
        }

        await sock.sendMessage(from, { text, mentions }, { quoted: message });
    }
};
