export default {
    name: 'setname',
    aliases: ['changename', 'groupname'],
    category: 'admin',
    description: 'Change group name',
    usage: 'setname <new name>',
    example: 'setname Cool Group',
    cooldown: 5,
    permissions: ['admin'],
    args: true,
    minArgs: 1,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from }) {
        try {
            const newName = args.join(' ');
            
            if (newName.length > 100) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Group name too long (max 100 characters)'
                }, { quoted: message });
            }

            await sock.groupUpdateSubject(from, newName);

            await sock.sendMessage(from, {
                text: `✅ Group name changed successfully to:\n${newName}`
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Error: Failed to change group name\n';
            if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else {
                errorMessage += error.message;
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};