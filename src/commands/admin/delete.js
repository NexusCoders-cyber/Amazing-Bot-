export default {
    name: 'delete',
    aliases: ['del', 'remove'],
    category: 'admin',
    description: 'Delete bot messages or user messages',
    usage: 'delete [reply to message]',
    example: 'delete (reply to a message)',
    cooldown: 2,
    permissions: ['admin'],
    groupOnly: false,
    adminOnly: false,
    botAdminRequired: false,

    async execute({ sock, message, from, sender, isGroup, isGroupAdmin, isOwner, isSudo }) {
        try {
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const stanzaId = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
            const participant = message.message?.extendedTextMessage?.contextInfo?.participant;

            if (!quotedMessage || !stanzaId) {
                return await sock.sendMessage(from, {
                    text: '❌ Please reply to a message to delete it'
                }, { quoted: message });
            }

            const botJid = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
            const isOwnMessage = participant === botJid || message.message?.extendedTextMessage?.contextInfo?.fromMe;
            const isUserMessage = participant === sender;

            if (!isOwnMessage && !isUserMessage && !isGroupAdmin && !isOwner && !isSudo) {
                return await sock.sendMessage(from, {
                    text: '❌ You can only delete your own messages or bot messages'
                }, { quoted: message });
            }

            if (isGroup && !isOwnMessage && !isGroupAdmin && !isOwner && !isSudo) {
                return await sock.sendMessage(from, {
                    text: '❌ Only admins can delete other users messages'
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                delete: {
                    remoteJid: from,
                    fromMe: isOwnMessage,
                    id: stanzaId,
                    participant: participant
                }
            });

            const confirmMsg = await sock.sendMessage(from, {
                text: '✅ Message deleted successfully'
            }, { quoted: message });

            setTimeout(async () => {
                try {
                    await sock.sendMessage(from, {
                        delete: confirmMsg.key
                    });
                } catch (e) {}
            }, 3000);

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to delete message\n\nError: ${error.message}`
            }, { quoted: message });
        }
    }
};