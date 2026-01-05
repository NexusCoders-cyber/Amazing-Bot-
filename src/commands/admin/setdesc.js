export const setdesc = {
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
                    text: 'Error: Description too long (max 512 characters)'
                }, { quoted: message });
            }

            await sock.groupUpdateDescription(from, newDesc);

            await sock.sendMessage(from, {
                text: 'Group description updated successfully'
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `Error: Failed to change description\n${error.message}`
            }, { quoted: message });
        }
    }
};
