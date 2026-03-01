export default {
    name: 'join',
    aliases: ['joingroup', 'addbot'],
    category: 'owner',
    description: 'Join a WhatsApp group via invite link (Owner Only)',
    usage: 'join <invite_link>',
    cooldown: 10,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            const inviteLink = args[0];
            
            if (!this.isValidInviteLink(inviteLink)) {
                return sock.sendMessage(from, {
                    text: 'Error: Invalid Invite Link\n\nPlease provide a valid WhatsApp group invite link\n\nValid formats:\n• https://chat.whatsapp.com/xxxxxxxxx\n• chat.whatsapp.com/xxxxxxxxx\n\nExample: join https://chat.whatsapp.com/ABC123DEF456'
                });
            }
            
            const inviteCode = this.extractInviteCode(inviteLink);
            
            await sock.sendMessage(from, {
                text: `Joining WhatsApp Group\n\nAction by: Owner (${sender.split('@')[0]})\nInvite Code: ${inviteCode}\n\nProcessing invite and joining group...`
            });
            
            try {
                const result = await sock.groupAcceptInvite(inviteCode);
                
                if (result) {
                    const successMessage = `Successfully Joined Group\n\nJoined at: ${new Date().toLocaleString()}\nGroup ID: ${result}\nInvite code: ${inviteCode}\n\nBot Status: Active member\nBot is now active in the group and ready to serve`;
                    
                    await sock.sendMessage(from, { text: successMessage });
                    
                    try {
                        await sock.sendMessage(result, {
                            text: `Hello Everyone!\n\nWhatsApp Bot has joined the group\n\nWhat I can do:\n• 128+ commands available\n• Games, media, utilities\n• AI assistance\n• Group management\n• Entertainment features\n\nGetting Started:\n• Type help to see all commands\n• Type menu for command categories\n• Use ping to test bot response\n\nAdded by: ${sender.split('@')[0]}`
                        });
                    } catch (welcomeError) {
                        console.log('Could not send welcome message:', welcomeError.message);
                    }
                    
                } else {
                    throw new Error('Failed to join group');
                }
                
            } catch (joinError) {
                console.error('Group join error:', joinError);
                
                const errorMessage = `Failed to Join Group\n\nError: ${joinError.message}\n\nPossible causes:\n• Invalid or expired invite link\n• Group is full (max 1024 members)\n• Bot is banned from the group\n• Admin approval required\n• Network connectivity issues\n\nSolutions:\n• Request a new invite link\n• Check if group has space\n• Contact group admin\n• Try again later`;
                
                await sock.sendMessage(from, { text: errorMessage });
            }
            
        } catch (error) {
            console.error('Join command error:', error);
            
            await sock.sendMessage(from, {
                text: `Critical Join System Error\n\nSystem Error: ${error.message}\n\nActions needed:\n• Check WhatsApp API status\n• Verify bot permissions\n• Review group management system\n• Monitor for account restrictions`
            });
        }
    },
    
    isValidInviteLink(link) {
        const patterns = [
            /^https:\/\/chat\.whatsapp\.com\/[a-zA-Z0-9]+$/,
            /^chat\.whatsapp\.com\/[a-zA-Z0-9]+$/,
            /^whatsapp\.com\/[a-zA-Z0-9]+$/
        ];
        
        return patterns.some(pattern => pattern.test(link));
    },
    
    extractInviteCode(link) {
        return link.split('/').pop();
    }
};
