export default {
    name: 'mute',
    aliases: ['close', 'lockgroup'],
    category: 'admin',
    description: 'Mute group (only admins can send messages)',
    usage: 'mute',
    example: 'mute',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, from, sender }) {
        try {
            const groupMetadata = await sock.groupMetadata(from);
            
            if (groupMetadata.announce) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Group is already muted'
                }, { quoted: message });
            }

            await sock.groupSettingUpdate(from, 'announcement');

            await sock.sendMessage(from, {
                text: '✅ Group muted successfully\n\n🔒 Only admins can send messages now'
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Error: Failed to mute group\n';
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