import config from '../../config.js';
import { updateUser } from '../../models/User.js';

export default {
    name: 'ban',
    aliases: ['block'],
    category: 'admin',
    description: 'Ban a user from using the bot',
    usage: 'ban @user OR reply to message [reason]',
    example: 'ban @user spamming',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return sock.sendMessage(from, {
                text: 'Error: This command can only be used in groups'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return sock.sendMessage(from, {
                text: 'Error: You need to be a group admin to use this command'
            }, { quoted: message });
        }

        try {
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            let targetJid;
            let reason = 'No reason provided';

            if (quotedUser) {
                targetJid = quotedUser;
                reason = args.join(' ') || reason;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
                reason = args.slice(1).join(' ') || reason;
            } else if (args[0]) {
                const phone = args[0].replace(/[^0-9]/g, '');
                if (phone.length > 7) {
                    targetJid = phone + '@s.whatsapp.net';
                    reason = args.slice(1).join(' ') || reason;
                }
            }

            if (!targetJid) {
                return sock.sendMessage(from, {
                    text: 'Error: Reply to a message or mention a user to ban\n\nUsage: ban @user [reason] OR reply to message'
                }, { quoted: message });
            }

            if (config.ownerNumbers.some(owner => targetJid.includes(owner.split('@')[0]))) {
                return sock.sendMessage(from, {
                    text: 'Error: Cannot ban the bot owner'
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return sock.sendMessage(from, {
                    text: 'Error: You cannot ban yourself'
                }, { quoted: message });
            }

            try {
                await updateUser(targetJid, {
                    isBanned: true,
                    banReason: reason,
                    bannedAt: new Date(),
                    bannedBy: sender
                });
            } catch (error) {
                console.error('Database error:', error);
            }

            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(from, {
                text: `User Banned\n\nUser: @${targetNumber}\nReason: ${reason}\nBanned by: @${sender.split('@')[0]}\nDate: ${new Date().toLocaleDateString()}\n\nUser can no longer use bot commands`,
                mentions: [targetJid, sender]
            }, { quoted: message });

        } catch (error) {
            console.error('Ban command error:', error);
            await sock.sendMessage(from, {
                text: `Error: Failed to ban user\n${error.message}`
            }, { quoted: message });
        }
    }
};
