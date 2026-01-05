import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'slot',
    aliases: ['slots', 'slotmachine'],
    category: 'economy',
    description: 'Play the slot machine and win big!',
    usage: 'slot <bet amount>',
    example: 'slot 1000',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            if (!args[0]) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Usage\n\nPlease specify a bet amount.\n\n📝 Example: .slot 1000\n\n💡 Win multipliers:\n🍒🍒🍒 = 3x\n🍋🍋🍋 = 5x\n🍊🍊🍊 = 7x\n💎💎💎 = 10x\n🎰🎰🎰 = 20x\n💰💰💰 = 50x'
                }, { quoted: message });
                return;
            }

            const betAmount = parseInt(args[0]);

            if (isNaN(betAmount) || betAmount <= 0) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Amount\n\nPlease enter a valid bet amount.'
                }, { quoted: message });
                return;
            }

            if (betAmount < 100) {
                await sock.sendMessage(from, {
                    text: '❌ Minimum Bet\n\nMinimum bet is 🪙 100'
                }, { quoted: message });
                return;
            }

            let user = await getUser(sender);
            if (!user) {
                user = await createUser({
                    jid: sender,
                    phone: sender.split('@')[0],
                    name: message.pushName || 'User',
                    economy: { balance: 1000, bank: 0, level: 1, xp: 0 }
                });
            }

            const balance = user.economy?.balance || 0;

            if (balance < betAmount) {
                await sock.sendMessage(from, {
                    text: `❌ Insufficient Balance\n\nYou need 🪙 ${betAmount.toLocaleString()} but only have 🪙 ${balance.toLocaleString()}\n\n💡 Work or claim daily rewards to earn more!`
                }, { quoted: message });
                return;
            }

            const symbols = [
                { emoji: '🍒', weight: 30, multiplier: 3 },
                { emoji: '🍋', weight: 25, multiplier: 5 },
                { emoji: '🍊', weight: 20, multiplier: 7 },
                { emoji: '💎', weight: 15, multiplier: 10 },
                { emoji: '🎰', weight: 7, multiplier: 20 },
                { emoji: '💰', weight: 3, multiplier: 50 }
            ];

            const spin = () => {
                const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
                const random = Math.random() * totalWeight;
                let currentWeight = 0;
                
                for (const symbol of symbols) {
                    currentWeight += symbol.weight;
                    if (random <= currentWeight) {
                        return symbol;
                    }
                }
                return symbols[0];
            };

            const reel1 = spin();
            const reel2 = spin();
            const reel3 = spin();

            const spinAnimation = await sock.sendMessage(from, {
                text: '🎰 SPINNING...\n\n[ 🎲 | 🎲 | 🎲 ]\n\n⏳ Please wait...'
            }, { quoted: message });

            await new Promise(resolve => setTimeout(resolve, 1500));

            let resultMessage = `🎰 SLOT MACHINE 🎰\n\n`;
            resultMessage += `┏━━━━━━━━━━━┓\n`;
            resultMessage += `┃ ${reel1.emoji} │ ${reel2.emoji} │ ${reel3.emoji} ┃\n`;
            resultMessage += `┗━━━━━━━━━━━┛\n\n`;

            const isWin = reel1.emoji === reel2.emoji && reel2.emoji === reel3.emoji;
            let newBalance;
            let xpGained = 0;

            if (isWin) {
                const winAmount = betAmount * reel1.multiplier;
                newBalance = balance - betAmount + winAmount;
                xpGained = Math.floor(winAmount / 10);

                resultMessage += `🎉 JACKPOT! 🎉\n\n`;
                resultMessage += `💰 Bet: 🪙 ${betAmount.toLocaleString()}\n`;
                resultMessage += `🎰 Multiplier: ${reel1.multiplier}x\n`;
                resultMessage += `✨ Won: 🪙 ${winAmount.toLocaleString()}\n`;
                resultMessage += `💎 Profit: 🪙 ${(winAmount - betAmount).toLocaleString()}\n`;
                resultMessage += `💵 New Balance: 🪙 ${newBalance.toLocaleString()}\n`;
                resultMessage += `⚡ XP Gained: +${xpGained} XP`;
            } else {
                newBalance = balance - betAmount;
                resultMessage += `❌ NO WIN\n\n`;
                resultMessage += `💔 Lost: 🪙 ${betAmount.toLocaleString()}\n`;
                resultMessage += `💵 New Balance: 🪙 ${newBalance.toLocaleString()}\n\n`;
                resultMessage += `💡 Try again! Better luck next time!`;
            }

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
                'economy.xp': finalXP,
                'economy.level': newLevel
            });

            if (leveledUp) {
                const levelReward = newLevel * 500;
                const finalBalance = newBalance + levelReward;
                await updateUser(sender, {
                    'economy.balance': finalBalance
                });
                resultMessage += `\n\n🎊 LEVEL UP! ${currentLevel} → ${newLevel}\n`;
                resultMessage += `🎁 Level Bonus: 🪙 ${levelReward.toLocaleString()}\n`;
                resultMessage += `💰 Final Balance: 🪙 ${finalBalance.toLocaleString()}`;
            }

            await sock.sendMessage(from, {
                text: resultMessage,
                edit: spinAnimation.key
            });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Slot machine error. Please try again.'
            }, { quoted: message });
        }
    }
};
