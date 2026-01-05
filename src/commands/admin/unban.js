import { updateUser } from '../../models/User.js';

export default {
    name: 'unban',
    aliases: ['unblock', 'unbanuser'],
    category: 'admin',
    description: 'Remove ban from a user',
    usage: 'unban @user OR reply to message',
    example: 'unban @user',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: 'Error: This command can only be used in groups'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: 'Error: You need to be a group admin to use this command'
            }, { quoted: message });
        }

        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else if (args[0]) {
                const phone = args[0].replace(/[^0-9]/g, '');
                if (phone.length > 7) {
                    targetJid = phone + '@s.whatsapp.net';
                }
            }

            if (!targetJid) {
                return await sock.sendMessage(from, {
                    text: 'Error: Reply to a message, mention a user, or provide their number\n\nUsage: unban @user OR reply to message'
                }, { quoted: message });
            }

            try {
                await updateUser(targetJid, {
                    $set: {
                        isBanned: false,
                        banReason: null,
                        bannedBy: null,
                        banUntil: null
                    }
                });
            } catch (error) {
                console.error('Database error:', error);
            }

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `User Unbanned\n\nUser: @${targetNumber}\nUnbanned by: @${sender.split('@')[0]}\nDate: ${new Date().toLocaleDateString()}\n\nUser can now use bot commands again`,
                mentions: [targetJid, sender]
            }, { quoted: message });

            try {
                await sock.sendMessage(targetJid, {
                    text: `You Are Unbanned\n\nUnbanned by: @${sender.split('@')[0]}\nDate: ${new Date().toLocaleDateString()}\n\nYou can now use bot commands. Please follow the rules`,
                    mentions: [sender]
                });
            } catch (e) {}

        } catch (error) {
            await sock.sendMessage(from, {
                text: `Error: Failed to unban user\n${error.message}`
            }, { quoted: message });
        }
    }
};
