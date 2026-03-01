import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'deposit',
    aliases: ['dep', 'bank'],
    category: 'economy',
    description: 'Deposit money to your bank',
    usage: 'deposit <amount|all>',
    example: 'deposit 5000',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            if (!args[0]) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Usage\n\nPlease specify an amount to deposit.\n\n📝 Examples:\n• .deposit 5000\n• .deposit all'
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

            if (walletBalance === 0) {
                await sock.sendMessage(from, {
                    text: '❌ Empty Wallet\n\nYou have no money in your wallet to deposit!\n\n💡 Work or claim daily rewards to earn money.'
                }, { quoted: message });
                return;
            }

            let depositAmount;

            if (args[0].toLowerCase() === 'all') {
                depositAmount = walletBalance;
            } else {
                depositAmount = parseInt(args[0]);
                
                if (isNaN(depositAmount) || depositAmount <= 0) {
                    await sock.sendMessage(from, {
                        text: '❌ Invalid Amount\n\nPlease specify a valid amount to deposit.'
                    }, { quoted: message });
                    return;
                }
            }

            if (depositAmount > walletBalance) {
                await sock.sendMessage(from, {
                    text: `❌ Insufficient Funds\n\nYou only have 🪙 ${walletBalance.toLocaleString()} in your wallet.\n\n💡 Try: .deposit all`
                }, { quoted: message });
                return;
            }

            const newWalletBalance = walletBalance - depositAmount;
            const newBankBalance = bankBalance + depositAmount;

            await updateUser(sender, {
                'economy.balance': newWalletBalance,
                'economy.bank': newBankBalance
            });

            const depositMessage = `✅ Deposit Successful!\n\n`;

            await sock.sendMessage(from, {
                text: `${depositMessage}💰 Deposited: 🪙 ${depositAmount.toLocaleString()}\n\n📊 Account Status:\n💵 Wallet: 🪙 ${newWalletBalance.toLocaleString()}\n🏦 Bank: 🪙 ${newBankBalance.toLocaleString()}\n💎 Total: 🪙 ${(newWalletBalance + newBankBalance).toLocaleString()}\n\n🔒 Your money is safe in the bank!`
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Deposit failed. Please try again.'
            }, { quoted: message });
        }
    }
};
