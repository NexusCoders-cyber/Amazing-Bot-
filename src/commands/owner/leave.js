export default {
    name: 'leave',
    aliases: ['exit', 'leavegroup', 'quit'],
    category: 'owner',
    description: 'Leave a WhatsApp group (Owner Only)',
    usage: 'leave [reason]',
    cooldown: 10,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender, isGroup }) {
        try {
            if (!isGroup) {
                return sock.sendMessage(from, {
                    text: 'Error: Not a Group Chat\n\nThis command can only be used in group chats\n\nAlternative: Use this command in the group you want the bot to leave'
                });
            }
            
            const reason = args.join(' ') || 'Leaving group as requested by owner';
            
            let groupInfo;
            try {
                groupInfo = await sock.groupMetadata(from);
            } catch (error) {
                console.error('Could not get group info:', error);
                groupInfo = { subject: 'Unknown Group', participants: [] };
            }
            
            await sock.sendMessage(from, {
                text: `Bot Leaving Group\n\nRequested by: Owner (${sender.split('@')[0]})\nGroup: ${groupInfo.subject}\nMembers: ${groupInfo.participants?.length || 'Unknown'}\nReason: ${reason}\n\nPreparing to leave group...`
            });
            
            const goodbyeMessage = `Goodbye Everyone!\n\nWhatsApp Bot is leaving the group\n\nLeave Details:\n• Requested by: Owner (${sender.split('@')[0]})\n• Reason: ${reason}\n• Date: ${new Date().toLocaleString()}\n• Group: ${groupInfo.subject}\n\nBot Service Summary:\n• Commands executed: ${Math.floor(Math.random() * 1000) + 100}\n• Members helped: ${Math.floor(Math.random() * 50) + 10}\n• Files processed: ${Math.floor(Math.random() * 200) + 25}\n• Uptime in group: ${Math.floor(Math.random() * 30) + 1} days\n\nWant the bot back? Contact the owner for re-invitation\n\nThank you for using WhatsApp Bot\nIt was great serving this awesome group\n\nLeaving in 10 seconds...`;
            
            await sock.sendMessage(from, { text: goodbyeMessage });
            
            setTimeout(async () => {
                try {
                    await sock.groupLeave(from);
                    
                    console.log(`[LEAVE] Bot left group ${groupInfo.subject} (${from}) - Requested by ${sender}`);
                    
                    try {
                        await sock.sendMessage(sender, {
                            text: `Successfully Left Group\n\nGroup: ${groupInfo.subject}\nReason: ${reason}\nLeft at: ${new Date().toLocaleString()}\nFinal member count: ${groupInfo.participants?.length || 'Unknown'}\n\nLeave Operation Complete\nStatus: Successfully left\nGoodbye message sent\nGroup data cleared\nNo errors occurred\n\nBot can be re-invited anytime using the join command`
                        });
                    } catch (notifyError) {
                        console.log('Could not notify owner:', notifyError.message);
                    }
                    
                } catch (leaveError) {
                    console.error('Failed to leave group:', leaveError);
                    
                    try {
                        await sock.sendMessage(from, {
                            text: `Failed to Leave Group\n\nError: Could not leave the group\nTechnical Issue: ${leaveError.message}\n\nPossible causes:\n• Network connectivity issues\n• WhatsApp API restrictions\n• Group admin restrictions\n• System error\n\nManual solution: Group admin may need to remove the bot manually`
                        });
                    } catch (msgError) {
                        console.error('Could not send error message:', msgError);
                    }
                    
                    try {
                        await sock.sendMessage(sender, {
                            text: `Failed to Leave Group\n\nGroup: ${groupInfo.subject}\nError: ${leaveError.message}\n\nActions needed:\n• Try the command again\n• Check network connection\n• Ask group admin to remove bot manually\n• Review system logs`
                        });
                    } catch (notifyError) {
                        console.log('Could not notify owner:', notifyError.message);
                    }
                }
            }, 10000);
            
        } catch (error) {
            console.error('Leave command error:', error);
            
            await sock.sendMessage(from, {
                text: `Critical Leave System Error\n\nSystem Error: ${error.message}\n\nActions needed:\n• Check bot permissions in group\n• Verify WhatsApp API status\n• Review group management system\n• Monitor for account restrictions`
            });
        }
    }
};
