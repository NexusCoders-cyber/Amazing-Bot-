export default {
    name: 'tagall',
    aliases: ['mentionall', 'everyone'],
    category: 'admin',
    description: 'Tag all group members with a message',
    usage: 'tagall [message] OR reply to message',
    cooldown: 15,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, args, from, isGroup, isGroupAdmin }) {
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

        try {
            let text = args.join(' ') || 'Group Notification';
            
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedText = message.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                                  message.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '';
                if (quotedText) {
                    text = quotedText;
                }
            }
            
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);

            let tagMessage = `📢 Group Announcement\n\n${text}\n\n👥 Tagged Members:\n`;
            
            participants.forEach((participant, index) => {
                const number = participant.split('@')[0];
                tagMessage += `${index + 1}. @${number}\n`;
            });

            tagMessage += `\n✅ Total Members: ${participants.length}\n📅 Date: ${new Date().toLocaleDateString()}\n⏰ Time: ${new Date().toLocaleTimeString()}`;

            await sock.sendMessage(from, {
                text: tagMessage,
                mentions: participants
            }, { quoted: message });

        } catch (error) {
            console.error('Tagall error:', error);
            await sock.sendMessage(from, {
                text: '❌ Error: Failed to tag all members. Try again or contact admin'
            }, { quoted: message });
        }
    }
};