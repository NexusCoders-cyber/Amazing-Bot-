import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'work',
    aliases: ['job', 'earn'],
    category: 'economy',
    description: 'Work to earn money',
    usage: 'work',
    example: 'work',
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
                        lastWork: null
                    }
                });
            }

            const now = Date.now();
            const lastWork = user.economy?.lastWork || 0;
            const cooldown = 60 * 60 * 1000;

            if (now - lastWork < cooldown) {
                const timeLeft = cooldown - (now - lastWork);
                const minutes = Math.floor(timeLeft / 60000);

                await sock.sendMessage(from, {
                    text: `⏰ Work Cooldown\n\nYou're still tired from your last job!\n\n⏳ Rest for: ${minutes} minutes\n\n💡 Take a break and come back later!`
                }, { quoted: message });
                return;
            }

            const jobs = [
                { name: 'Software Developer', emoji: '💻', min: 800, max: 1500 },
                { name: 'Designer', emoji: '🎨', min: 600, max: 1200 },
                { name: 'Content Writer', emoji: '✍️', min: 500, max: 1000 },
                { name: 'Teacher', emoji: '👨‍🏫', min: 700, max: 1300 },
                { name: 'Chef', emoji: '👨‍🍳', min: 600, max: 1100 },
                { name: 'Doctor', emoji: '⚕️', min: 1000, max: 2000 },
                { name: 'Engineer', emoji: '👷', min: 900, max: 1600 },
                { name: 'Musician', emoji: '🎵', min: 500, max: 1200 },
                { name: 'Photographer', emoji: '📸', min: 600, max: 1300 },
                { name: 'Delivery Driver', emoji: '🚗', min: 400, max: 900 }
            ];

            const selectedJob = jobs[Math.floor(Math.random() * jobs.length)];
            const earnings = Math.floor(Math.random() * (selectedJob.max - selectedJob.min + 1)) + selectedJob.min;
            const xpGained = Math.floor(earnings / 20);

            const newBalance = (user.economy?.balance || 1000) + earnings;
            const newXP = (user.economy?.xp || 0) + xpGained;
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
                'economy.lastWork': now,
                'economy.xp': finalXP,
                'economy.level': newLevel
            });

            let workMessage = `${selectedJob.emoji} Work Complete!\n\n`;
            workMessage += `💼 Job: ${selectedJob.name}\n`;
            workMessage += `💰 Earned: 🪙 ${earnings.toLocaleString()}\n`;
            workMessage += `✨ XP Gained: +${xpGained} XP\n`;
            workMessage += `💵 New Balance: 🪙 ${newBalance.toLocaleString()}\n\n`;

            if (leveledUp) {
                const levelReward = newLevel * 500;
                const finalBalance = newBalance + levelReward;
                await updateUser(sender, {
                    'economy.balance': finalBalance
                });
                workMessage += `🎉 LEVEL UP! ${currentLevel} → ${newLevel}\n`;
                workMessage += `🎁 Level Bonus: 🪙 ${levelReward.toLocaleString()}\n`;
                workMessage += `💰 Final Balance: 🪙 ${finalBalance.toLocaleString()}\n\n`;
            }

            workMessage += `⏰ Come back in 1 hour to work again!`;

            await sock.sendMessage(from, {
                text: workMessage
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Error processing work. Please try again.'
            }, { quoted: message });
        }
    }
};
