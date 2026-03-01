export default {
    name: 'hidetag',
    aliases: ['htag', 'announce'],
    category: 'admin',
    description: 'Send a message tagging everyone without showing mentions',
    usage: 'hidetag [message] OR reply to message',
    example: 'hidetag Important announcement',
    cooldown: 10,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, sender, isGroup, isGroupAdmin }) {
        if (!isGroup) {
            return await sock.sendMessage(from, {
                text: '❌ Error: This command works in groups only'
            }, { quoted: message });
        }

        if (!isGroupAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ Error: You need admin privileges'
            }, { quoted: message });
        }

        try {
            let text = args.join(' ');
            
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedText = message.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                                  message.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '';
                if (quotedText) {
                    text = quotedText;
                }
            }

            if (!text) {
                return await sock.sendMessage(from, {
                    text: '❌ Error: No message provided. Provide text or reply to a message'
                }, { quoted: message });
            }

            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);

            const hiddenTagMessage = `📢 Announcement\n\n${text}\n\n✅ Hidden tag notification\nDate: ${new Date().toLocaleDateString()}\nTime: ${new Date().toLocaleTimeString()}`;

            await sock.sendMessage(from, {
                text: hiddenTagMessage,
                mentions: participants
            }, { quoted: message });

        } catch (error) {
            console.error('Hidetag error:', error);
            await sock.sendMessage(from, {
                text: '❌ Error: Hidetag failed. Try again later'
            }, { quoted: message });
        }
    }
};