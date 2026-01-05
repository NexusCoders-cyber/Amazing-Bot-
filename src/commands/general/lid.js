import crypto from 'crypto';

export default {
    name: 'lid',
    aliases: ['myid', 'userid'],
    category: 'general',
    description: 'Get your unique LID (Local Identifier)',
    usage: 'lid',
    example: 'lid',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, sender }) {
        try {
            const phoneNumber = sender.split('@')[0];
            const lid = crypto.createHash('sha256').update(phoneNumber).digest('hex').substring(0, 16).toUpperCase();
            
            const userInfo = `╭━━━━━━━━━━━━━━━━━━╮
│  USER INFORMATION
╰━━━━━━━━━━━━━━━━━━╯

📱 Phone: +${phoneNumber}
🆔 LID: ${lid}
👤 Name: ${message.pushName || 'User'}
📅 Date: ${new Date().toLocaleDateString()}
⏰ Time: ${new Date().toLocaleTimeString()}

💡 Your LID is a unique identifier generated from your phone number. Keep it safe!`;

            await sock.sendMessage(from, {
                text: userInfo
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Error generating LID. Please try again.'
            }, { quoted: message });
        }
    }
};
