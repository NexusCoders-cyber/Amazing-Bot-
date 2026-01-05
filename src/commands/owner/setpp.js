export default {
    name: 'setstatus',
    aliases: ['setbio', 'changestatus', 'updatebio'],
    category: 'owner',
    description: 'Set bot WhatsApp status/bio (Owner Only)',
    usage: 'setstatus <text>',
    cooldown: 30,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            const newStatus = args.join(' ');
            
            if (newStatus.length > 139) {
                return sock.sendMessage(from, {
                    text: `Error: Status Too Long\n\nWhatsApp status must be 139 characters or less\n\nCurrent length: ${newStatus.length} characters\nMaximum allowed: 139 characters\nExceeds by: ${newStatus.length - 139} characters\n\nPlease shorten your status and try again`
                });
            }
            
            if (newStatus.length < 1) {
                return sock.sendMessage(from, {
                    text: 'Error: Status Too Short\n\nStatus cannot be empty\n\nExamples:\n• "WhatsApp Bot - Always Online"\n• "Serving users 24/7"\n• "Your friendly AI assistant"\n• "Games, Media, Utilities & More!"'
                });
            }
            
            await sock.sendMessage(from, {
                text: `Updating Bot Status\n\nAction by: Owner (${sender.split('@')[0]})\nNew status: "${newStatus}"\nLength: ${newStatus.length}/139 characters\nStarted: ${new Date().toLocaleString()}\n\nApplying status update...`
            });
            
            try {
                await sock.updateProfileStatus(newStatus);
                
                const successMessage = `Status Updated Successfully\n\nStatus Change Complete:\n• New status: "${newStatus}"\n• Length: ${newStatus.length} characters\n• Updated: ${new Date().toLocaleString()}\n• Visible to: All contacts\n\nStatus Details:\n• Characters used: ${newStatus.length}/139\n• Words: ${newStatus.split(' ').length}\n• Contains emojis: ${this.containsEmojis(newStatus) ? 'Yes' : 'No'}\n\nVisibility:\n• All users will see the new status\n• Updates immediately in WhatsApp\n• Visible in contact info\n• Shows in status updates\n\nBot status updated successfully and is now live`;
                
                await sock.sendMessage(from, { text: successMessage });
                
                console.log(`[SETSTATUS] Status updated by ${sender}: "${newStatus}"`);
                
            } catch (statusError) {
                console.error('Status update error:', statusError);
                
                await sock.sendMessage(from, {
                    text: `Status Update Failed\n\nError: ${statusError.message}\n\nPossible causes:\n• WhatsApp API restrictions\n• Rate limiting (too many updates)\n• Network connectivity issues\n• Special characters not supported\n• Account restrictions\n• Server-side error\n\nSolutions:\n• Wait 5 minutes before retrying\n• Remove special characters\n• Use simpler text\n• Check internet connection\n• Try shorter status\n• Verify account status\n\nStatus remains unchanged`
                });
            }
            
        } catch (error) {
            console.error('SetStatus command error:', error);
            
            await sock.sendMessage(from, {
                text: `Critical Status System Error\n\nSystem Error: ${error.message}\n\nActions needed:\n• Check WhatsApp API connectivity\n• Verify bot profile permissions\n• Review status update capabilities\n• Monitor for account restrictions\n• Check rate limiting status`
            });
        }
    },
    
    containsEmojis(text) {
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
        return emojiRegex.test(text);
    }
};
