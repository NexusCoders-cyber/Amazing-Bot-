import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'transfer',
    aliases: ['send', 'pay', 'give'],
    category: 'economy',
    description: 'Transfer money to another user',
    usage: 'transfer @mention <amount>',
    example: 'transfer @user 1000',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            
            if (!mentionedJid) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Usage\n\nPlease mention a user to transfer money to.\n\n📝 Example: .transfer @user 1000'
                }, { quoted: message });
                return;
            }

            if (mentionedJid === sender) {
                await sock.sendMessage(from, {
                    text: '❌ Cannot Transfer\n\nYou cannot transfer money to yourself!'
                }, { quoted: message });
                return;
            }

            const amount = parseInt(args[0]);

            if (isNaN(amount) || amount <= 0) {
                await sock.sendMessage(from, {
                    text: '❌ Invalid Amount\n\nPlease specify a valid amount to transfer.\n\n📝 Example: .transfer @user 1000'
                }, { quoted: message });
                return;
            }

            if (amount < 100) {
                await sock.sendMessage(from, {
                    text: '❌ Minimum Transfer\n\nThe minimum transfer amount is 🪙 100'
                }, { quoted: message });
                return;
            }

            let senderUser = await getUser(sender);
            if (!senderUser) {
                senderUser = await createUser({
                    jid: sender,
                    phone: sender.split('@')[0],
                    name: message.pushName || 'User',
                    economy: { balance: 1000, bank: 0, level: 1, xp: 0 }
                });
            }

            const senderBalance = senderUser.economy?.balance || 0;

            if (senderBalance < amount) {
                await sock.sendMessage(from, {
                    text: `❌ Insufficient Balance\n\nYou need 🪙 ${amount.toLocaleString()} but only have 🪙 ${senderBalance.toLocaleString()}\n\n💡 Work or claim daily rewards to earn more!`
                }, { quoted: message });
                return;
            }

            let receiverUser = await getUser(mentionedJid);
            if (!receiverUser) {
                receiverUser = await createUser({
                    jid: mentionedJid,
                    phone: mentionedJid.split('@')[0],
                    name: 'User',
                    economy: { balance: 1000, bank: 0, level: 1, xp: 0 }
                });
            }

            const tax = Math.floor(amount * 0.05);
            const amountAfterTax = amount - tax;
            const newSenderBalance = senderBalance - amount;
            const newReceiverBalance = (receiverUser.economy?.balance || 0) + amountAfterTax;

            await updateUser(sender, { 'economy.balance': newSenderBalance });
            await updateUser(mentionedJid, { 'economy.balance': newReceiverBalance });

            const transferMessage = `✅ Transfer Successful!\n\n`;
            const senderName = message.pushName || 'You';
            const receiverName = mentionedJid.split('@')[0];

            await sock.sendMessage(from, {
                text: `${transferMessage}💸 Amount Sent: 🪙 ${amount.toLocaleString()}\n🏦 Tax (5%): 🪙 ${tax.toLocaleString()}\n💵 Received: 🪙 ${amountAfterTax.toLocaleString()}\n\n👤 From: ${senderName}\n👤 To: @${receiverName}\n\n💰 Your New Balance: 🪙 ${newSenderBalance.toLocaleString()}`,
                mentions: [mentionedJid]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Transfer failed. Please try again.'
            }, { quoted: message });
        }
    }
};
