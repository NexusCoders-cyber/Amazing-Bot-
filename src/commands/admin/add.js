export default {
    name: 'add',
    aliases: ['invite'],
    category: 'admin',
    description: 'Add a member to the group',
    usage: 'add <number>',
    example: 'add 2347085663318',
    cooldown: 3,
    permissions: ['admin'],
    args: true,
    minArgs: 1,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            let number = args[0].replace(/[^0-9]/g, '');
            
            if (number.startsWith('0')) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Use international format without +\nExample: 2347075663318'
                }, { quoted: message });
            }

            if (number.length < 10) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: Number too short. Provide valid phone number'
                }, { quoted: message });
            }

            const userJid = number + '@s.whatsapp.net';
            
            await sock.groupParticipantsUpdate(from, [userJid], 'add');

            await sock.sendMessage(from, {
                text: `✅ Successfully added user to group\n@${number}`,
                mentions: [userJid]
            }, { quoted: message });

        } catch (error) {
            let errorMessage = '❌ Failed to add user\n\n';
            
            if (error.message.includes('participant-exists')) {
                errorMessage += 'User is already in group';
            } else if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else if (error.message.includes('invite-restrict')) {
                errorMessage += 'Group has invite restrictions';
            } else {
                errorMessage += error.message;
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};