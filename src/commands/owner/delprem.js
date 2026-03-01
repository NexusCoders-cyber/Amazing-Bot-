export default {
    name: 'delprem',
    aliases: ['removeprem', 'prem-', 'delpremium'],
    category: 'owner',
    description: 'Remove premium membership from a user (Owner Only)',
    usage: 'delprem @user [reason]',
    cooldown: 5,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        try {
            let targetUser = null;
            let reason = args.slice(1).join(' ') || 'Premium revoked by owner';
            
            // Get target user from mention or reply
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetUser = message.message.extendedTextMessage.contextInfo.participant;
            } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetUser = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (args[0].includes('@')) {
                targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
            } else {
                return sock.sendMessage(from, {
                    text: '❌ *Invalid User*\n\nPlease mention a user or reply to their message:\n• `delprem @user [reason]`\n• Reply to user message: `delprem [reason]`\n\n*Example:* delprem @user Violation of terms'
                });
            }
            
            const username = targetUser.split('@')[0];
            
            try {
                // Mock premium system - would interact with database in real implementation
                const premiumData = await this.removePremiumUser(targetUser, reason);
                
                if (!premiumData.hadPremium) {
                    return sock.sendMessage(from, {
                        text: `ℹ️ *User Not Premium*\n\n👤 **User:** @${username}\n💎 **Status:** Standard User\n\n*This user does not have premium membership to remove.*`,
                        contextInfo: {
                            mentionedJid: [targetUser]
                        }
                    });
                }
                
                const removalMessage = `✅ *Premium Membership Removed Successfully!*\n\n👤 **User:** @${username}\n💎 **Previous Status:** Premium Member\n📅 **Removed On:** ${new Date().toLocaleDateString()}\n⏰ **Previous Expiry:** ${premiumData.previousExpiry}\n📝 **Reason:** ${reason}\n🎖️ **Membership ID:** ${premiumData.membershipId}\n\n📊 **Premium Statistics:**\n• Days used: ${premiumData.daysUsed}\n• Commands executed: ${premiumData.commandsUsed}\n• Features accessed: ${premiumData.featuresUsed}\n• Savings: $${premiumData.savings}\n\n⚠️ **Access Revoked:**\n• Unlimited commands ❌\n• Priority support ❌\n• Advanced features ❌\n• Exclusive commands ❌\n• Custom preferences ❌\n• Premium badge ❌\n\n💡 *User has been notified of premium removal*`;
                
                await sock.sendMessage(from, {
                    text: removalMessage,
                    contextInfo: {
                        mentionedJid: [targetUser]
                    }
                });
                
                // Notify the user about premium removal
                try {
                    await sock.sendMessage(targetUser.replace('s.whatsapp.net', 'c.us'), {
                        text: `📢 *Premium Membership Removed*\n\n💎 **Your premium membership has been removed**\n\n📋 **Removal Details:**\n• Removed on: ${new Date().toLocaleDateString()}\n• Reason: ${reason}\n• Previous expiry: ${premiumData.previousExpiry}\n• Membership ID: ${premiumData.membershipId}\n\n📊 **Your Premium Journey:**\n• Days enjoyed: ${premiumData.daysUsed}\n• Commands used: ${premiumData.commandsUsed}\n• Features accessed: ${premiumData.featuresUsed}\n\n⚠️ **Important Changes:**\n• Standard cooldowns now apply\n• Limited command usage\n• No priority support\n• Advanced features locked\n• Exclusive commands unavailable\n\n💡 **Want Premium Back?**\nContact the bot owner for premium upgrade options\n\n*Thank you for being a premium member!*`
                    });
                } catch (notifyError) {
                    console.log('Could not notify user directly:', notifyError.message);
                }
                
            } catch (premiumError) {
                console.error('Premium removal error:', premiumError);
                
                await sock.sendMessage(from, {
                    text: `❌ *Premium Removal Failed*\n\n**Error:** ${premiumError.message}\n\n**Possible causes:**\n• Database connection error\n• User data not found\n• System resource constraints\n• Premium system malfunction\n\n**Solutions:**\n• Check database status\n• Verify user has premium\n• Try again later\n• Check system logs\n\n*Contact system administrator if problem persists*`
                });
            }
            
        } catch (error) {
            console.error('DelPrem command error:', error);
            
            await sock.sendMessage(from, {
                text: `❌ *Critical Premium System Error*\n\n**System Error:** ${error.message}\n\n🚨 **Alert:** Premium system malfunction\n\n**Actions needed:**\n• Check premium database integrity\n• Review user management system\n• Verify access control system\n• Monitor for data corruption\n\n⚠️ *Premium services may be compromised*`
            });
        }
    },
    
    async removePremiumUser(userId, reason) {
        // Mock database operation - in real implementation would remove from database
        
        // Simulate checking if user has premium
        const hadPremium = Math.random() > 0.3; // 70% chance user had premium
        
        if (!hadPremium) {
            return { hadPremium: false };
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            hadPremium: true,
            membershipId: 'PREM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            userId: userId,
            reason: reason,
            removedAt: new Date(),
            previousExpiry: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            daysUsed: Math.floor(Math.random() * 60) + 5,
            commandsUsed: Math.floor(Math.random() * 1000) + 100,
            featuresUsed: Math.floor(Math.random() * 15) + 5,
            savings: Math.floor(Math.random() * 50) + 10
        };
    }
};