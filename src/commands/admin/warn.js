import { updateUser, getUser } from '../../models/User.js';

const userWarnings = new Map();

export default {
    name: 'warn',
    aliases: ['warning', 'warnuser'],
    category: 'admin',
    description: 'Give a warning to a user',
    usage: 'warn @user OR reply to message [reason]',
    example: 'warn @user breaking rules',
    cooldown: 5,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender }) {
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
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Mention or reply to a user to warn'
                }, { quoted: message });
            }

            if (targetJid === sender) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: You cannot warn yourself'
                }, { quoted: message });
            }

            const warningKey = `${from}_${targetJid}`;
            const warnings = userWarnings.get(warningKey) || [];
            
            const newWarning = {
                reason: reason,
                warnedBy: sender,
                warnedAt: new Date(),
                groupId: from
            };

            warnings.push(newWarning);
            userWarnings.set(warningKey, warnings);

            const warningCount = warnings.length;
            const targetNumber = targetJid.split('@')[0];
            const warnedByNumber = sender.split('@')[0];

            let responseText = `⚠️ User Warned\n\n`;
            responseText += `👤 User: @${targetNumber}\n`;
            responseText += `📝 Reason: ${reason}\n`;
            responseText += `👮 Warned by: @${warnedByNumber}\n`;
            responseText += `📊 Warnings: ${warningCount}/3\n`;
            responseText += `📅 Date: ${new Date().toLocaleDateString()}`;

            if (warningCount >= 3) {
                responseText += `\n\n🚫 AUTO-ACTION: User has received 3 warnings!`;
                
                try {
                    await updateUser(targetJid, {
                        $set: {
                            isBanned: true,
                            banReason: `3 warnings in group`,
                            bannedBy: sender,
                            bannedAt: new Date()
                        }
                    });
                    
                    responseText += `\n⛔ User has been banned from using the bot`;
                } catch (dbError) {
                    console.error('Failed to ban user:', dbError);
                }
            } else {
                const remaining = 3 - warningCount;
                responseText += `\n⚠️ ${remaining} warning${remaining > 1 ? 's' : ''} remaining before ban`;
            }

            await sock.sendMessage(from, {
                text: responseText,
                mentions: [targetJid, sender]
            }, { quoted: message });

            try {
                await sock.sendMessage(targetJid, {
                    text: `⚠️ You Have Been Warned\n\n📝 Reason: ${reason}\n👮 By: @${warnedByNumber}\n📊 Warning: ${warningCount}/3\n📅 Date: ${new Date().toLocaleDateString()}\n\n⚠️ Please follow the group rules`,
                    mentions: [sender]
                });
            } catch (e) {
                console.error('Failed to notify user:', e);
            }

        } catch (error) {
            console.error('Warn command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error: Failed to warn user\n${error.message}`
            }, { quoted: message });
        }
    }
};

export { userWarnings };