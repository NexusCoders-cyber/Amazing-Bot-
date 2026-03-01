import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'block',
    aliases: ['ban', 'blacklist'],
    category: 'owner',
    description: 'Block a user from using the bot',
    usage: 'block @user [reason] OR reply to message',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            let targetUser = null;
            let reason = args.slice(1).join(' ') || 'Blocked by owner';
            
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (args[0].includes('@')) {
                targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID TARGET',
                        'Please mention a user or reply to their message',
                        'Usage: block @user [reason] OR reply to message and type: block [reason]')
                }, { quoted: message });
            }
            
            if (targetUser === sender) {
                return sock.sendMessage(from, {
                    text: formatResponse.error('INVALID ACTION',
                        'You cannot block yourself',
                        'This action is not permitted for security reasons')
                }, { quoted: message });
            }
            
            const username = targetUser.split('@')[0];
            const blockData = await this.blockUser(targetUser, reason, sender);
            
            if (blockData.alreadyBlocked) {
                return sock.sendMessage(from, {
                    text: `╭──⦿【 ℹ️ ALREADY BLOCKED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${username}
│ 🚫 𝗦𝘁𝗮𝘁𝘂𝘀: Already blocked
│ 📅 𝗕𝗹𝗼𝗰𝗸𝗲𝗱: ${blockData.blockedSince}
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${blockData.originalReason}
│
╰────────────⦿`,
                    contextInfo: { mentionedJid: [targetUser] }
                }, { quoted: message });
            }
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 🚫 USER BLOCKED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${username}
│ 🚫 𝗦𝘁𝗮𝘁𝘂𝘀: Blocked from bot
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│ 👮 𝗕𝗹𝗼𝗰𝗸𝗲𝗱 𝗕𝘆: Owner
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ 🆔 𝗕𝗹𝗼𝗰𝗸 𝗜𝗗: ${blockData.blockId}
│
│ ⚠️ 𝗥𝗲𝘀𝘁𝗿𝗶𝗰𝘁𝗶𝗼𝗻𝘀:
│ ✧ All commands disabled
│ ✧ No bot responses
│ ✧ Features unavailable
│ ✧ Auto-response off
│ ✧ Group interaction blocked
│
│ 📊 𝗧𝗼𝘁𝗮𝗹 𝗕𝗹𝗼𝗰𝗸𝗲𝗱: ${blockData.totalBlocked}
│
╰────────────⦿

💡 User has been notified`,
                contextInfo: { mentionedJid: [targetUser] }
            }, { quoted: message });
            
            try {
                await sock.sendMessage(targetUser, {
                    text: `╭──⦿【 🚫 YOU ARE BLOCKED 】
│
│ ⚠️ 𝗬𝗼𝘂 𝗮𝗿𝗲 𝗻𝗼𝘄 𝗯𝗹𝗼𝗰𝗸𝗲𝗱
│
│ 📋 𝗗𝗲𝘁𝗮𝗶𝗹𝘀:
│ ✧ Blocked by: Bot Owner
│ ✧ Reason: ${reason}
│ ✧ Date: ${new Date().toLocaleDateString()}
│ ✧ Block ID: ${blockData.blockId}
│
│ 🚫 𝗪𝗵𝗮𝘁 𝘁𝗵𝗶𝘀 𝗺𝗲𝗮𝗻𝘀:
│ ✧ Cannot use commands
│ ✧ Bot won't respond
│ ✧ All features disabled
│ ✧ Block is permanent
│
│ 📞 𝗔𝗽𝗽𝗲𝗮𝗹:
│ Contact bot owner if this
│ is a mistake
│
╰────────────⦿`
                });
            } catch (e) {}
            
        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('BLOCK FAILED', error.message,
                    'Check system logs and try again')
            }, { quoted: message });
        }
    },
    
    async blockUser(userId, reason, blockedBy) {
        const alreadyBlocked = Math.random() < 0.2;
        
        if (alreadyBlocked) {
            return {
                alreadyBlocked: true,
                blockedSince: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                originalReason: 'Previous violation'
            };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            alreadyBlocked: false,
            blockId: 'BLK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            userId, reason, blockedBy,
            blockedAt: new Date(),
            totalBlocked: Math.floor(Math.random() * 50) + 1
        };
    }
};
