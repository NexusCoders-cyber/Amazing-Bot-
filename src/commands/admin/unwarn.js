import { userWarnings } from './warn.js';

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
                    text: '❌ Error: Mention or reply to a user'
                }, { quoted: message });
            }

            const warningKey = `${from}_${targetJid}`;
            const warnings = userWarnings.get(warningKey) || [];
            
            if (warnings.length === 0) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: User has no warnings'
                }, { quoted: message });
            }

            const currentWarnings = warnings.length;
            const targetNumber = targetJid.split('@')[0];
            const senderNumber = sender.split('@')[0];

            if (amount >= currentWarnings) {
                userWarnings.delete(warningKey);
                
                await sock.sendMessage(from, {
                    text: `✅ Warnings Cleared\n\n👤 User: @${targetNumber}\n🗑️ Removed: ${currentWarnings} warning${currentWarnings > 1 ? 's' : ''}\n👮 By: @${senderNumber}\n📅 Date: ${new Date().toLocaleDateString()}\n\n✅ Clean record`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            } else {
                const updatedWarnings = warnings.slice(0, -amount);
                userWarnings.set(warningKey, updatedWarnings);

                const remainingWarnings = updatedWarnings.length;
                
                await sock.sendMessage(from, {
                    text: `✅ Warnings Removed\n\n👤 User: @${targetNumber}\n🗑️ Removed: ${amount} warning${amount > 1 ? 's' : ''}\n📊 Remaining: ${remainingWarnings}/3\n👮 By: @${senderNumber}\n📅 Date: ${new Date().toLocaleDateString()}`,
                    mentions: [targetJid, sender]
                }, { quoted: message });
            }

            try {
                const finalCount = warnings.length - amount;
                await sock.sendMessage(targetJid, {
                    text: `✅ Warning${amount > 1 ? 's' : ''} Removed\n\n🗑️ Removed: ${amount > currentWarnings ? currentWarnings : amount} warning${amount > 1 ? 's' : ''}\n${finalCount > 0 ? `📊 Remaining: ${finalCount}/3` : '✅ Clean record'}\n👮 By: @${senderNumber}\n📅 Date: ${new Date().toLocaleDateString()}`,
                    mentions: [sender]
                });
            } catch (e) {
                console.error('Failed to notify user:', e);
            }

        } catch (error) {
            console.error('Unwarn command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error: Failed to remove warnings\n${error.message}`
            }, { quoted: message });
        }
    }
};