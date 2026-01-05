export default {
    name: 'unwarn',
    aliases: ['removewarn', 'clearwarn'],
    category: 'admin',
    description: 'Remove warnings from a user',
    usage: 'unwarn @user OR reply to message [amount]',
    example: 'unwarn @user 1',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            let amount = 1;

            if (quotedUser) {
                targetJid = quotedUser;
                amount = parseInt(args[0]) || 1;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                amount = parseInt(args[1]) || 1;
            } else {
                return await sock.sendMessage(from, {
                    text: 'Error: Mention or reply to a user'
                }, { quoted: message });
            }

            const warnings = userWarnings.get(targetJid) || [];
            
            if (warnings.length === 0) {
                return await sock.sendMessage(from, {
                    text: 'Error: User has no warnings'
                }, { quoted: message });
            }

            const currentWarnings = warnings.length;

            if (amount >= currentWarnings) {
                userWarnings.delete(targetJid);
                
                const targetNumber = targetJid.split('@')[0];
                await sock.sendMessage(from, {
                    text: `Warnings Cleared\n\nUser: @${targetNumber}\nRemoved: ${currentWarnings} warnings\nBy: @${sender.split('@')[0]}\nDate: ${new Date().toLocaleDateString()}\n\nClean record`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            } else {
                const updatedWarnings = warnings.slice(0, -amount);
                userWarnings.set(targetJid, updatedWarnings);

                const remainingWarnings = updatedWarnings.length;
                const targetNumber = targetJid.split('@')[0];
                await sock.sendMessage(from, {
                    text: `Warnings Removed\n\nUser: @${targetNumber}\nRemoved: ${amount} warnings\nRemaining: ${remainingWarnings}/3\nBy: @${sender.split('@')[0]}\nDate: ${new Date().toLocaleDateString()}`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            }

        } catch (error) {
            await sock.sendMessage(from, {
                text: `Error: Failed to remove warnings\n${error.message}`
            }, { quoted: message });
        }
    }
};
