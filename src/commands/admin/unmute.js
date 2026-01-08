export default {
    name: 'unmute',
    aliases: ['open', 'unlockgroup'],
    category: 'admin',
    description: 'Unmute group (all members can send messages)',
    usage: 'unmute',
    example: 'unmute',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender }) {
        try {
            const groupMetadata = await sock.groupMetadata(from);
            
            if (!groupMetadata.announce) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Group is already open'
                }, { quoted: message });
            }

            await sock.groupSettingUpdate(from, 'not_announcement');

            await sock.sendMessage(from, {
                text: '✅ Group unmuted successfully\n\n🔓 All members can send messages now'
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Error: Failed to unmute group\n';
            if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else {
                errorMessage += error.message;
            }

            await sock.sendMessage(from, {
                text: errorMessage
            }, { quoted: message });
        }
    }
};