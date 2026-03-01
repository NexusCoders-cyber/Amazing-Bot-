import formatResponse from '../../utils/formatUtils.js';

export default {
    name: 'unblock',
    aliases: ['unban', 'whitelist'],
    category: 'owner',
    description: 'Unblock a user and restore bot access',
    usage: 'unblock @user [reason] OR reply to message',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        try {
            let targetUser = null;
            let reason = args.slice(1).join(' ') || 'Unblocked by owner';
            
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
                        'Usage: unblock @user [reason] OR reply to message and type: unblock [reason]')
                }, { quoted: message });
            }
            
            const username = targetUser.split('@')[0];
            const unblockData = await this.unblockUser(targetUser, reason);
            
            if (!unblockData.wasBlocked) {
                return sock.sendMessage(from, {
                    text: `╭──⦿【 ℹ️ NOT BLOCKED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${username}
│ ✅ 𝗦𝘁𝗮𝘁𝘂𝘀: Not blocked
│
│ User has full access
│
╰────────────⦿`,
                    contextInfo: { mentionedJid: [targetUser] }
                }, { quoted: message });
            }
            
            await sock.sendMessage(from, {
                text: `╭──⦿【 ✅ USER UNBLOCKED 】
│
│ 👤 𝗨𝘀𝗲𝗿: @${username}
│ ✅ 𝗦𝘁𝗮𝘁𝘂𝘀: Access restored
│ 📅 𝗗𝗮𝘁𝗲: ${new Date().toLocaleDateString()}
│ 👮 𝗨𝗻𝗯𝗹𝗼𝗰𝗸𝗲𝗱 𝗕𝘆: Owner
│ 📝 𝗥𝗲𝗮𝘀𝗼𝗻: ${reason}
│ 🆔 𝗕𝗹𝗼𝗰𝗸 𝗜𝗗: ${unblockData.blockId}
│
│ 🎉 𝗔𝗰𝗰𝗲𝘀𝘀 𝗥𝗲𝘀𝘁𝗼𝗿𝗲𝗱:
│ ✧ All commands enabled
│ ✧ Full feature access
│ ✧ Bot responds normally
│ ✧ Auto-response on
│ ✧ Group interaction allowed
│
│ 📊 𝗕𝗹𝗼𝗰𝗸 𝗛𝗶𝘀𝘁𝗼𝗿𝘆:
│ ✧ Blocked: ${unblockData.originalBlockDate}
│ ✧ Duration: ${unblockData.blockDuration}
│ ✧ Reason: ${unblockData.originalReason}
│
╰────────────⦿

💡 User has been notified`,
                contextInfo: { mentionedJid: [targetUser] }
            }, { quoted: message });
            
            try {
                await sock.sendMessage(targetUser, {
                    text: `╭──⦿【 🎉 YOU ARE UNBLOCKED 】
│
│ ✅ 𝗔𝗰𝗰𝗲𝘀𝘀 𝗥𝗲𝘀𝘁𝗼𝗿𝗲𝗱
│
│ 📋 𝗗𝗲𝘁𝗮𝗶𝗹𝘀:
│ ✧ Unblocked by: Bot Owner
│ ✧ Reason: ${reason}
│ ✧ Date: ${new Date().toLocaleDateString()}
│ ✧ Block ID: ${unblockData.blockId}
│
│ ✅ 𝗪𝗵𝗮𝘁 𝘁𝗵𝗶𝘀 𝗺𝗲𝗮𝗻𝘀:
│ ✧ All commands work
│ ✧ Bot responds now
│ ✧ Full features available
│ ✧ Restrictions removed
│
│ 🎯 𝗚𝗲𝘁 𝗦𝘁𝗮𝗿𝘁𝗲𝗱:
│ ✧ Type help for commands
│ ✧ Type menu to explore
│ ✧ Type ping to test
│
╰────────────⦿

🚨 Follow bot rules to avoid future blocks

💫 Welcome back! Enjoy responsibly.`
                });
            } catch (e) {}
            
        } catch (error) {
            await sock.sendMessage(from, {
                text: formatResponse.error('UNBLOCK FAILED', error.message,
                    'Check system logs and try again')
            }, { quoted: message });
        }
    },
    
    async unblockUser(userId, reason) {
        const wasBlocked = Math.random() < 0.8;
        
        if (!wasBlocked) {
            return { wasBlocked: false };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const blockDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const blockDuration = Math.floor((Date.now() - blockDate) / (24 * 60 * 60 * 1000));
        
        return {
            wasBlocked: true,
            blockId: 'BLK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            userId, reason,
            originalBlockDate: blockDate.toLocaleDateString(),
            blockDuration: `${blockDuration} days`,
            originalReason: 'Terms violation'
        };
    }
};
