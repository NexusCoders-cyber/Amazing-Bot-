import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'daily',
    aliases: ['dailyreward', 'claim'],
    category: 'economy',
    description: 'Claim your daily reward',
    usage: 'daily',
    example: 'daily',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, sender }) {
        try {
            let user = await getUser(sender);
            
            if (!user) {
                user = await createUser({
                    jid: sender,
                    phone: sender.split('@')[0],
                    name: message.pushName || 'User',
                    economy: {
                        balance: 1000,
                        bank: 0,
                        level: 1,
                        xp: 0,
                        rank: 'Beginner',
                        dailyStreak: 0,
                        lastDaily: null
                    }
                });
            }

            const now = Date.now();
            const lastDaily = user.economy?.lastDaily || 0;
            const cooldown = 24 * 60 * 60 * 1000;

            if (now - lastDaily < cooldown) {
                const timeLeft = cooldown - (now - lastDaily);
                const hours = Math.floor(timeLeft / 3600000);
                const minutes = Math.floor((timeLeft % 3600000) / 60000);

                await sock.sendMessage(from, {
                    text: `⏰ Daily Cooldown\n\nYou already claimed your daily reward!\n\n⏳ Time left: ${hours}h ${minutes}m\n\n💡 Come back later to claim again!`
                }, { quoted: message });
                return;
            }

            const streak = user.economy?.dailyStreak || 0;
            const isConsecutive = (now - lastDaily) < (48 * 60 * 60 * 1000);
            const newStreak = isConsecutive ? streak + 1 : 1;

            const baseReward = 1000;
            const streakBonus = Math.min(newStreak * 100, 1000);
            const totalReward = baseReward + streakBonus;

            const newBalance = (user.economy?.balance || 1000) + totalReward;
            const newXP = (user.economy?.xp || 0) + 50;
            const currentLevel = user.economy?.level || 1;
            const xpForNextLevel = currentLevel * 100;
            
            let newLevel = currentLevel;
            let leveledUp = false;
            let finalXP = newXP;

            if (newXP >= xpForNextLevel) {
                newLevel = currentLevel + 1;
                finalXP = newXP - xpForNextLevel;
                leveledUp = true;
            }

            await updateUser(sender, {
                'economy.balance': newBalance,
                'economy.lastDaily': now,
                'economy.dailyStreak': newStreak,
                'economy.xp': finalXP,
                'economy.level': newLevel
            });

            let rewardMessage = `✅ Daily Reward Claimed!\n\n`;
            rewardMessage += `💰 Base Reward: 🪙 ${baseReward.toLocaleString()}\n`;
            rewardMessage += `🔥 Streak Bonus: 🪙 ${streakBonus.toLocaleString()} (Day ${newStreak})\n`;
            rewardMessage += `━━━━━━━━━━━━━━━\n`;
            rewardMessage += `💎 Total Earned: 🪙 ${totalReward.toLocaleString()}\n`;
            rewardMessage += `💵 New Balance: 🪙 ${newBalance.toLocaleString()}\n`;
            rewardMessage += `✨ XP Earned: +50 XP\n\n`;
            
            if (leveledUp) {
                const levelReward = newLevel * 500;
                const finalBalance = newBalance + levelReward;
                await updateUser(sender, {
                    'economy.balance': finalBalance
                });
                rewardMessage += `🎉 LEVEL UP! ${currentLevel} → ${newLevel}\n`;
                rewardMessage += `🎁 Level Bonus: 🪙 ${levelReward.toLocaleString()}\n`;
                rewardMessage += `💰 Final Balance: 🪙 ${finalBalance.toLocaleString()}\n\n`;
            }

            rewardMessage += `📅 Come back in 24 hours for more rewards!`;

            await sock.sendMessage(from, {
                text: rewardMessage
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Error claiming daily reward. Please try again.'
            }, { quoted: message });
        }
    }
};
