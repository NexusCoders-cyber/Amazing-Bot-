import { getAllUsers, getUser } from '../../models/User.js';

export default {
    name: 'leaderboard',
    aliases: ['lb', 'top', 'rich', 'richest'],
    category: 'economy',
    description: 'View the richest users',
    usage: 'leaderboard [money|level|xp]',
    example: 'leaderboard money',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            const type = (args[0] || 'money').toLowerCase();
            
            if (!['money', 'level', 'xp'].includes(type)) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Type\n\nAvailable leaderboards:\n• money - Richest users\n• level - Highest levels\n• xp - Most XP\n\n📝 Example: .leaderboard money'
                }, { quoted: message });
                return;
            }

            const allUsers = await getAllUsers({}, 100, 0);
            
            if (!allUsers || allUsers.length === 0) {
                await sock.sendMessage(from, {
                    text: '❌ No Data\n\nNo users found in the database.'
                }, { quoted: message });
                return;
            }

            let sortedUsers;
            let title;
            let emoji;

            if (type === 'money') {
                sortedUsers = allUsers
                    .map(u => ({
                        jid: u.jid,
                        name: u.name || u.phone || 'Unknown',
                        total: (u.economy?.balance || 0) + (u.economy?.bank || 0)
                    }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);
                title = '💰 RICHEST USERS';
                emoji = '🪙';
            } else if (type === 'level') {
                sortedUsers = allUsers
                    .map(u => ({
                        jid: u.jid,
                        name: u.name || u.phone || 'Unknown',
                        value: u.economy?.level || 1
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);
                title = '⭐ HIGHEST LEVELS';
                emoji = '🏆';
            } else {
                sortedUsers = allUsers
                    .map(u => ({
                        jid: u.jid,
                        name: u.name || u.phone || 'Unknown',
                        value: u.economy?.xp || 0
                    }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);
                title = '✨ MOST XP';
                emoji = '💫';
            }

            const currentUser = await getUser(sender);
            const medals = ['🥇', '🥈', '🥉'];

            let leaderboardText = `╭━━━━━━━━━━━━━━━━━━╮\n│  ${title}\n╰━━━━━━━━━━━━━━━━━━╯\n\n`;

            sortedUsers.forEach((user, index) => {
                const medal = medals[index] || `${index + 1}.`;
                const displayValue = type === 'money' ? user.total : user.value;
                const formattedValue = type === 'money' ? `${emoji} ${displayValue.toLocaleString()}` : `${displayValue}`;
                leaderboardText += `${medal} ${user.name}\n   ${formattedValue}\n\n`;
            });

            let userPosition = -1;
            if (type === 'money') {
                const userTotal = (currentUser?.economy?.balance || 0) + (currentUser?.economy?.bank || 0);
                userPosition = allUsers
                    .map(u => (u.economy?.balance || 0) + (u.economy?.bank || 0))
                    .sort((a, b) => b - a)
                    .indexOf(userTotal) + 1;
            } else if (type === 'level') {
                const userLevel = currentUser?.economy?.level || 1;
                userPosition = allUsers
                    .map(u => u.economy?.level || 1)
                    .sort((a, b) => b - a)
                    .indexOf(userLevel) + 1;
            } else {
                const userXP = currentUser?.economy?.xp || 0;
                userPosition = allUsers
                    .map(u => u.economy?.xp || 0)
                    .sort((a, b) => b - a)
                    .indexOf(userXP) + 1;
            }

            if (userPosition > 0 && userPosition > 10) {
                leaderboardText += `━━━━━━━━━━━━━━━━━━\n\n`;
                leaderboardText += `📍 Your Position: #${userPosition}\n`;
            } else if (userPosition > 0 && userPosition <= 10) {
                leaderboardText += `━━━━━━━━━━━━━━━━━━\n\n`;
                leaderboardText += `🌟 You're in the Top 10! (#${userPosition})\n`;
            }

            leaderboardText += `\n💡 Keep earning to climb the ranks!`;

            await sock.sendMessage(from, {
                text: leaderboardText
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Error loading leaderboard. Please try again.'
            }, { quoted: message });
        }
    }
};
