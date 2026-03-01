export default {
    name: 'promote',
    aliases: ['admin', 'makeadmin'],
    category: 'admin',
    description: 'Promote a member to admin',
    usage: 'promote @user OR reply to message',
    example: 'promote @user',
    cooldown: 3,
    permissions: ['admin'],
    args: false,
    minArgs: 0,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender }) {
        try {
            const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
            
            let targetUser = replied || mentioned[0];
            
            if (!targetUser) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Mention or reply to a user to promote'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const targetParticipant = groupMetadata.participants.find(p => {
                const pNumber = p.id.split(':')[0].split('@')[0];
                const tNumber = targetUser.split(':')[0].split('@')[0];
                return pNumber === tNumber;
            });

            if (targetParticipant?.admin) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: User is already an admin'
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetUser], 'promote');

            await sock.sendMessage(from, {
                text: `✅ Successfully promoted user to admin\n@${targetUser.split('@')[0]}`,
                mentions: [targetUser]
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Error: Failed to promote user\n';
            if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else {
                errorMessage += error.message;
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};