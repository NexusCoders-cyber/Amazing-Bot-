import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'withdraw',
    aliases: ['with', 'wd'],
    category: 'economy',
    description: 'Withdraw money from your bank',
    usage: 'withdraw <amount|all>',
    example: 'withdraw 5000',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            if (!args[0]) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Usage\n\nPlease specify an amount to withdraw.\n\n📝 Examples:\n• .withdraw 5000\n• .withdraw all'
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

            const walletBalance = user.economy?.balance || 0;
            const bankBalance = user.economy?.bank || 0;

            if (bankBalance === 0) {
                await sock.sendMessage(from, {
                    text: '❌ Empty Bank\n\nYou have no money in your bank to withdraw!\n\n💡 Use .deposit to store money in your bank.'
                }, { quoted: message });
                return;
            }

            let withdrawAmount;

            if (args[0].toLowerCase() === 'all') {
                withdrawAmount = bankBalance;
            } else {
                withdrawAmount = parseInt(args[0]);
                
                if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
                    await sock.sendMessage(from, {
                        text: '❌ Invalid Amount\n\nPlease specify a valid amount to withdraw.'
                    }, { quoted: message });
                    return;
                }
            }

            if (withdrawAmount > bankBalance) {
                await sock.sendMessage(from, {
                    text: `❌ Insufficient Bank Funds\n\nYou only have 🪙 ${bankBalance.toLocaleString()} in your bank.\n\n💡 Try: .withdraw all`
                }, { quoted: message });
                return;
            }

            const newWalletBalance = walletBalance + withdrawAmount;
            const newBankBalance = bankBalance - withdrawAmount;

            await updateUser(sender, {
                'economy.balance': newWalletBalance,
                'economy.bank': newBankBalance
            });

            const withdrawMessage = `✅ Withdrawal Successful!\n\n`;

            await sock.sendMessage(from, {
                text: `${withdrawMessage}💰 Withdrawn: 🪙 ${withdrawAmount.toLocaleString()}\n\n📊 Account Status:\n💵 Wallet: 🪙 ${newWalletBalance.toLocaleString()}\n🏦 Bank: 🪙 ${newBankBalance.toLocaleString()}\n💎 Total: 🪙 ${(newWalletBalance + newBankBalance).toLocaleString()}\n\n💸 Money transferred to your wallet!`
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Withdrawal failed. Please try again.'
            }, { quoted: message });
        }
    }
};
