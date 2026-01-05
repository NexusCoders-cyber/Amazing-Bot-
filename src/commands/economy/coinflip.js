import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'coinflip',
    aliases: ['cf', 'flip'],
    category: 'economy',
    description: 'Flip a coin and double your bet!',
    usage: 'coinflip <heads|tails> <amount>',
    example: 'coinflip heads 1000',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            if (!args[0] || !args[1]) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Usage\n\nPlease specify your choice and bet amount.\n\n📝 Example: .coinflip heads 1000\n\n💡 Choose heads or tails and win 2x your bet!'
                }, { quoted: message });
                return;
            }

            const choice = args[0].toLowerCase();
            const betAmount = parseInt(args[1]);

            if (!['heads', 'tails', 'h', 't'].includes(choice)) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Choice\n\nPlease choose either:\n• heads (or h)\n• tails (or t)'
                }, { quoted: message });
                return;
            }

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

            const userChoice = choice === 'h' ? 'heads' : choice === 't' ? 'tails' : choice;
            
            const flipAnimation = await sock.sendMessage(from, {
                text: '🪙 FLIPPING COIN...\n\n💫 Please wait...'
            }, { quoted: message });

            await new Promise(resolve => setTimeout(resolve, 1500));

            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = result === userChoice;

            let resultMessage = `🪙 COINFLIP RESULT 🪙\n\n`;
            resultMessage += `━━━━━━━━━━━━━━━\n`;
            resultMessage += result === 'heads' ? `      🟡 HEADS\n` : `      ⚪ TAILS\n`;
            resultMessage += `━━━━━━━━━━━━━━━\n\n`;

            let newBalance;
            let xpGained = 0;

            if (won) {
                const winAmount = betAmount * 2;
                newBalance = balance - betAmount + winAmount;
                xpGained = Math.floor(betAmount / 10);

                resultMessage += `✅ YOU WIN! 🎉\n\n`;
                resultMessage += `🎯 Your Choice: ${userChoice}\n`;
                resultMessage += `🪙 Result: ${result}\n\n`;
                resultMessage += `💰 Bet: 🪙 ${betAmount.toLocaleString()}\n`;
                resultMessage += `✨ Won: 🪙 ${winAmount.toLocaleString()}\n`;
                resultMessage += `💎 Profit: 🪙 ${betAmount.toLocaleString()}\n`;
                resultMessage += `💵 New Balance: 🪙 ${newBalance.toLocaleString()}\n`;
                resultMessage += `⚡ XP Gained: +${xpGained} XP`;
            } else {
                newBalance = balance - betAmount;
                resultMessage += `❌ YOU LOSE!\n\n`;
                resultMessage += `🎯 Your Choice: ${userChoice}\n`;
                resultMessage += `🪙 Result: ${result}\n\n`;
                resultMessage += `💔 Lost: 🪙 ${betAmount.toLocaleString()}\n`;
                resultMessage += `💵 New Balance: 🪙 ${newBalance.toLocaleString()}\n\n`;
                resultMessage += `💡 Better luck next time!`;
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
                edit: flipAnimation.key
            });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Coinflip error. Please try again.'
            }, { quoted: message });
        }
    }
};
