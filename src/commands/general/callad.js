export default {
    name: 'callad',
    aliases: ['reportowner', 'contactowner', 'ownerreport'],
    category: 'general',
    description: 'Send a message directly to the bot owner',
    usage: 'callad <your message> OR reply to a message with callad',
    example: 'callad I need help with the bot',
    cooldown: 60,
    permissions: [],

    async execute({ sock, message, args, from, sender, isGroup }) {
        try {
            const config = (await import('../../config.js')).default;
            
            if (!config.ownerNumbers || config.ownerNumbers.length === 0) {
                return await sock.sendMessage(from, {
                    text: '❌ Owner contact not configured\n\n💡 Bot owner needs to set OWNER_NUMBERS in environment variables.'
                }, { quoted: message });
            }
            
            const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const messageText = args.join(' ');
            
            if (!quotedMessage && !messageText) {
                return await sock.sendMessage(from, {
                    text: '📞 *CALLAD - Contact Owner*\n\n📝 Usage:\n• callad <message>\n• Reply to a message with: callad\n\n📌 Example:\ncallad I need help with the bot'
                }, { quoted: message });
            }
            
            await sock.sendMessage(from, {
                react: { text: '📨', key: message.key }
            });
            
            const senderNumber = sender.split('@')[0];
            const senderName = message.pushName || senderNumber;
            const timestamp = new Date().toLocaleString();
            const chatType = isGroup ? 'Group' : 'Private Chat';
            
            let groupInfo = '';
            if (isGroup) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    groupInfo = `\n👥 Group: ${groupMetadata.subject}\n🔗 Group ID: ${from}`;
                } catch (error) {
                    groupInfo = `\n🔗 Group ID: ${from}`;
                }
            }
            
            let ownerMessage = `📩 *NEW MESSAGE FROM USER*\n\n👤 From: ${senderName}\n📱 Number: @${senderNumber}\n💬 Chat Type: ${chatType}${groupInfo}\n🕐 Time: ${timestamp}\n\n━━━━━━━━━━━━━━━━━━\n\n💬 Message:\n"${messageText || 'See quoted message below'}"\n\n💡 Reply to this message to respond to the user`;
            
            const ownerJid = config.ownerNumbers[0];
            
            if (quotedMessage) {
                const quotedText = quotedMessage.conversation || 
                                 quotedMessage.extendedTextMessage?.text || 
                                 quotedMessage.imageMessage?.caption || 
                                 quotedMessage.videoMessage?.caption || 
                                 'Media message';
                
                ownerMessage += `\n\n📎 Quoted message: "${quotedText}"`;
                
                if (quotedMessage.imageMessage) {
                    const imageBuffer = await sock.downloadMediaMessage({
                        message: { imageMessage: quotedMessage.imageMessage }
                    });
                    
                    await sock.sendMessage(ownerJid, {
                        image: imageBuffer,
                        caption: ownerMessage,
                        mentions: [sender]
                    });
                } else if (quotedMessage.videoMessage) {
                    const videoBuffer = await sock.downloadMediaMessage({
                        message: { videoMessage: quotedMessage.videoMessage }
                    });
                    
                    await sock.sendMessage(ownerJid, {
                        video: videoBuffer,
                        caption: ownerMessage,
                        mentions: [sender]
                    });
                } else {
                    await sock.sendMessage(ownerJid, {
                        text: ownerMessage,
                        mentions: [sender]
                    });
                }
            } else {
                await sock.sendMessage(ownerJid, {
                    text: ownerMessage,
                    mentions: [sender]
                });
            }
            
            const successMessage = `✅ *MESSAGE SENT*\n\n📨 Your message has been sent to the bot owner\n⏰ Sent at: ${timestamp}\n\n💡 The owner will respond when available\n🙏 Thank you for contacting us!`;
            
            await sock.sendMessage(from, {
                text: successMessage
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });
            
            const logger = (await import('../../utils/logger.js')).default;
            logger.info(`Message sent to owner from ${senderName} (${senderNumber})`);
            
        } catch (error) {
            const logger = (await import('../../utils/logger.js')).default;
            logger.error('Error in callad command:', error);
            
            await sock.sendMessage(from, {
                text: '❌ *ERROR*\n\nFailed to send message to owner.\n\n💡 Please try again later.'
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};
