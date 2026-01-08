export default {
    name: 'setdesc',
    aliases: ['changedesc', 'groupdesc'],
    category: 'admin',
    description: 'Change group description',
    usage: 'setdesc <new description>',
    example: 'setdesc Welcome to our group',
    cooldown: 5,
    permissions: ['admin'],
    args: true,
    minArgs: 1,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from }) {
        try {
            const newDesc = args.join(' ');
            
            if (newDesc.length > 512) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Description too long (max 512 characters)'
                }, { quoted: message });
            }

            await sock.groupUpdateDescription(from, newDesc);

            await sock.sendMessage(from, {
                text: '✅ Group description updated successfully'
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Error: Failed to change description\n';
            if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else {
                errorMessage += error.message;
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};