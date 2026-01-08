export default {
    name: 'kick',
    aliases: ['remove'],
    category: 'admin',
    description: 'Remove a member from the group',
    usage: 'kick @user OR reply to message',
    example: 'kick @user',
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
                    text: '❌ Error: Mention or reply to a user to kick'
                }, { quoted: message });
            }

            const botJid = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
            if (targetUser === botJid) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Cannot kick myself'
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
                    text: '❌ Error: Cannot kick an admin. Demote first'
                }, { quoted: message });
            }

            await sock.groupParticipantsUpdate(from, [targetUser], 'remove');

            await sock.sendMessage(from, {
                text: `✅ Successfully removed user from group\n@${targetUser.split('@')[0]}`,
                mentions: [targetUser]
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Error: Failed to kick user\n';
            if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else {
                errorMessage += error.message;
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};