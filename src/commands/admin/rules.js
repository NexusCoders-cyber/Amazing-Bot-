export default {
    name: 'rules',
    aliases: ['rule', 'grouprules'],
    category: 'admin',
    description: 'View or add group rules (description)',
    usage: 'rules OR rules add <text>',
    example: 'rules\nrules add No spam allowed',
    cooldown: 3,
    permissions: ['admin'],
    args: false,
    minArgs: 0,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            const groupMetadata = await sock.groupMetadata(from);
            const groupName = groupMetadata.subject || 'Group';
            const currentDesc = groupMetadata.desc || 'No rules set';

            if (args.length === 0) {
                const rulesText = `╭──⦿【 📋 GROUP RULES 】
│
│ 🏷️ *${groupName}*
│
│ 📜 *Rules:*
│ ${currentDesc}
│
╰────────────⦿`;

                return await sock.sendMessage(from, {
                    text: rulesText
                }, { quoted: message });
            }

            if (args[0].toLowerCase() === 'add') {
                if (args.length < 2) {
                    return await sock.sendMessage(from, {
                        text: '❌ Error: Please provide text to add\n\n💡 Usage: rules add <text>'
                    }, { quoted: message });
                }

                const newRule = args.slice(1).join(' ');
                const updatedDesc = currentDesc === 'No rules set' ? newRule : `${currentDesc}\n${newRule}`;

                await sock.groupUpdateDescription(from, updatedDesc);

                await sock.sendMessage(from, {
                    text: `✅ Rule added successfully\n\n📜 *New Rule:*\n${newRule}`
                }, { quoted: message });
            } else {
                return await sock.sendMessage(from, {
                    text: '❌ Invalid option\n\n💡 Usage:\n• rules - View rules\n• rules add <text> - Add rule'
                }, { quoted: message });
            }

        } catch (error) {
            console.error('Rules command error:', error);

            let errorMessage = '❌ Error: Failed to execute command\n';
            if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else {
                errorMessage += error.message;
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};
