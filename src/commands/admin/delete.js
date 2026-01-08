export default {
    name: 'delete',
    aliases: ['del', 'remove'],
    category: 'admin',
    description: 'Delete a message by replying to it',
    usage: 'delete (reply to message)',
    example: 'Reply to message and type: delete',
    cooldown: 3,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin, isBotAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ Error: This command can only be used in groups'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ Error: You need to be a group admin to use this command'
            }, { quoted: message });
        }

        if (!isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ Error: I need admin privileges to delete messages. Make me an admin first'
            }, { quoted: message });
        }

        const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMessage) {
            return await sock.sendMessage(from, {
                text: '❌ Error: Reply to the message you want to delete\n\nUsage: Reply to message and type: delete'
            }, { quoted: message });
        }

        try {
            const quotedMessageId = message.message.extendedTextMessage.contextInfo.stanzaId;
            const quotedParticipant = message.message.extendedTextMessage.contextInfo.participant;

            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    fromMe: false,
                    id: quotedMessageId,
                    participant: quotedParticipant
                }
            });

            const confirmMsg = await sock.sendMessage(from, {
                text: `✅ Message Deleted\n\nAction: Message removed\nDeleted by: @${sender.split('@')[0]}\nDate: ${new Date().toLocaleDateString()}`,
                mentions: [sender]
            }, { quoted: message });

            setTimeout(async () => {
                try {
                    await sock.sendMessage(from, {
                        delete: {
                            remoteJid: from,
                            fromMe: true,
                            id: confirmMsg.key.id
                        }
                    });
                } catch (e) {}
            }, 3000);

        } catch (error) {
            let errorMessage = '❌ Error: Failed to delete the message\n';
            if (error.message.includes('not-authorized') || error.message.includes('forbidden')) {
                errorMessage += 'Bot lacks admin permission. Please verify bot is admin.';
            } else {
                errorMessage += 'Make sure I have admin permissions and the message is not too old';
            }

            await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
        }
    }
};