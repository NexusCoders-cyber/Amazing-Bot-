import { getUser } from '../../models/User.js';

export default {
    name: 'userinfo',
    aliases: ['uinfo', 'checkuser'],
    category: 'owner',
    description: 'Get detailed information about a user',
    usage: 'userinfo @user OR reply to message OR userinfo <phone>',
    example: 'userinfo @user',
    cooldown: 3,
    permissions: ['owner'],
    ownerOnly: true,

    async execute({ sock, message, args, from, sender }) {
        try {
            let targetJid;
            
            const quotedUser = message.message?.extendedTextMessage?.contextInfo?.participant;
            const mentionedUsers = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            if (quotedUser) {
                targetJid = quotedUser;
            } else if (mentionedUsers.length > 0) {
                targetJid = mentionedUsers[0];
            } else if (args[0]) {
                const phone = args[0].replace(/[^0-9]/g, '');
                if (phone.length > 7) {
                    targetJid = phone + '@s.whatsapp.net';
                } else {
                    targetJid = args[0];
                }
            } else {
                targetJid = sender;
            }

            if (!targetJid) {
                return await sock.sendMessage(from, {
                    text: 'Error: No user specified\n\nUsage:\n• Reply to a message\n• Mention a user (@user)\n• Provide phone number\n• Leave empty to check yourself'
                }, { quoted: message });
            }

            await sock.sendMessage(from, {
                text: 'Fetching user information...'
            }, { quoted: message });

            const user = await getUser(targetJid);

            if (!user) {
                return await sock.sendMessage(from, {
                    text: `User Not Found\n\nJID: ${targetJid}\n\nUser may not have interacted with the bot yet`
                }, { quoted: message });
            }

            const phone = user.phone || targetJid.split('@')[0];
            const name = user.name || 'Unknown';
            
            let userInfo = `User Information\n\n`;
            userInfo += `Name: ${name}\n`;
            userInfo += `JID: ${user.jid}\n`;
            userInfo += `Phone: +${phone}\n\n`;

            userInfo += `Status\n`;
            userInfo += `Premium: ${user.isPremium ? 'Yes' : 'No'}`;
            if (user.isPremium && user.premiumType) {
                userInfo += ` (${user.premiumType})`;
            }
            if (user.isPremium && user.premiumUntil) {
                userInfo += `\nExpires: ${new Date(user.premiumUntil).toLocaleDateString()}`;
            }
            userInfo += `\n`;
            
            userInfo += `Banned: ${user.isBanned ? 'Yes' : 'No'}`;
            if (user.isBanned) {
                userInfo += `\nReason: ${user.banReason || 'Not specified'}`;
                if (user.bannedBy) {
                    userInfo += `\nBy: ${user.bannedBy.split('@')[0]}`;
                }
                if (user.banUntil) {
                    userInfo += `\nUntil: ${new Date(user.banUntil).toLocaleDateString()}`;
                }
            }
            userInfo += `\n`;
            
            userInfo += `Blocked: ${user.isBlocked ? 'Yes' : 'No'}\n\n`;

            if (user.economy) {
                userInfo += `Economy\n`;
                userInfo += `Balance: ${user.economy.balance || 0}\n`;
                userInfo += `Bank: ${user.economy.bank || 0}\n`;
                userInfo += `Level: ${user.economy.level || 1}\n`;
                userInfo += `XP: ${user.economy.xp || 0}\n`;
                userInfo += `Rank: ${user.economy.rank || 'Beginner'}\n\n`;
            }

            if (user.gameStats) {
                userInfo += `Game Statistics\n`;
                userInfo += `Games Played: ${user.gameStats.gamesPlayed || 0}\n`;
                userInfo += `Games Won: ${user.gameStats.gamesWon || 0}\n`;
                userInfo += `Total Score: ${user.gameStats.totalScore || 0}\n`;
                
                const winRate = user.gameStats.gamesPlayed > 0 
                    ? ((user.gameStats.gamesWon / user.gameStats.gamesPlayed) * 100).toFixed(1)
                    : 0;
                userInfo += `Win Rate: ${winRate}%\n\n`;
            }

            if (user.statistics) {
                userInfo += `Activity Statistics\n`;
                userInfo += `Commands Used: ${user.statistics.commandsUsed || 0}\n`;
                userInfo += `Messages Sent: ${user.statistics.messagesSent || 0}\n`;
                
                if (user.statistics.lastActive) {
                    userInfo += `Last Active: ${this.formatDate(new Date(user.statistics.lastActive))}\n`;
                }
                if (user.statistics.joinedAt) {
                    userInfo += `Joined: ${this.formatDate(new Date(user.statistics.joinedAt))}\n`;
                }
                userInfo += `\n`;
            }

            if (user.warnings && user.warnings.length > 0) {
                userInfo += `Warnings: ${user.warnings.length}\n`;
                user.warnings.slice(0, 3).forEach((warn, index) => {
                    userInfo += `${index + 1}. ${warn.reason || 'No reason'}\n`;
                    if (warn.warnedBy) {
                        userInfo += `   By: ${warn.warnedBy.split('@')[0]}\n`;
                    }
                    if (warn.warnedAt) {
                        userInfo += `   Date: ${this.formatDate(new Date(warn.warnedAt))}\n`;
                    }
                });
                if (user.warnings.length > 3) {
                    userInfo += `... and ${user.warnings.length - 3} more\n`;
                }
                userInfo += `\n`;
            }

            if (user.joinedGroups && user.joinedGroups.length > 0) {
                userInfo += `Groups: ${user.joinedGroups.length} groups\n\n`;
            }

            if (user.afk && user.afk.isAfk) {
                userInfo += `AFK Status: Active\n`;
                userInfo += `Reason: ${user.afk.reason || 'No reason'}\n`;
                if (user.afk.since) {
                    userInfo += `Since: ${this.formatDate(new Date(user.afk.since))}\n`;
                }
                userInfo += `\n`;
            }

            userInfo += `Language: ${user.language || 'en'}\n`;
            userInfo += `Timezone: ${user.timezone || 'UTC'}\n`;

            if (user.createdAt) {
                userInfo += `\nDatabase Entry Created: ${this.formatDate(new Date(user.createdAt))}`;
            }

            await sock.sendMessage(from, {
                text: userInfo,
                mentions: [targetJid]
            }, { quoted: message });

        } catch (error) {
            console.error('Userinfo command error:', error);
            
            await sock.sendMessage(from, {
                text: `Error Fetching User Info\n\nError: ${error.message}\n\nCheck if user exists and database is connected`
            }, { quoted: message });
        }
    },

    formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
};
