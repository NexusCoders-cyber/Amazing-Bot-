import { userWarnings } from './warn.js';

export default {
    name: 'resetwarnings',
    aliases: ['clearallwarns', 'resetwarns'],
    category: 'admin',
    description: 'Clear all warnings in the group',
    usage: 'resetwarnings',
    example: 'resetwarnings',
    cooldown: 10,
    permissions: ['admin'],
    groupOnly: true,
    adminOnly: true,

    async execute({ sock, message, from, sender }) {
        try {
            let clearedCount = 0;
            const keysToDelete = [];

            for (const [key, warnings] of userWarnings.entries()) {
                if (key.startsWith(from)) {
                    clearedCount += warnings.length;
                    keysToDelete.push(key);
                }
            }

            if (clearedCount === 0) {
                return await sock.sendMessage(from, {
                    text: '✅ Clean Group\n\n📊 No warnings found in this group'
                }, { quoted: message });
            }

            keysToDelete.forEach(key => userWarnings.delete(key));

            const senderNumber = sender.split('@')[0];

            await sock.sendMessage(from, {
                text: `✅ All Warnings Cleared\n\n🗑️ Cleared: ${clearedCount} warning${clearedCount > 1 ? 's' : ''}\n👮 By: @${senderNumber}\n📅 Date: ${new Date().toLocaleDateString()}\n\n✅ Fresh start for everyone!`,
                mentions: [sender]
            }, { quoted: message });

        } catch (error) {
            console.error('Reset warnings error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error: Failed to reset warnings\n${error.message}`
            }, { quoted: message });
        }
    }
};