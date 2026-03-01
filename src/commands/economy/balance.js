import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'balance',
    aliases: ['bal', 'money', 'wallet'],
    category: 'economy',
    description: 'Check your balance and economy stats',
    usage: 'balance [@mention]',
    example: 'balance',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            let targetJid = sender;
            let targetName = message.pushName || 'User';

            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
                targetJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
                targetName = targetJid.split('@')[0];
            }

            let user = await getUser(targetJid);
            
            if (!user) {
                user = await createUser({
                    jid: targetJid,
                    phone: targetJid.split('@')[0],
                    name: targetName,
                    economy: {
                        balance: 1000,
                        bank: 0,
                        level: 1,
                        xp: 0,
                        rank: 'Beginner',
                        dailyStreak: 0
                    }
                });
            }

            const economy = user.economy || {};
            const balance = economy.balance || 0;
            const bank = economy.bank || 0;
            const total = balance + bank;
            const level = economy.level || 1;
            const xp = economy.xp || 0;
            const rank = economy.rank || 'Beginner';
            const streak = economy.dailyStreak || 0;

            const nextLevelXP = level * 100;
            const xpProgress = ((xp / nextLevelXP) * 100).toFixed(1);

            const balanceInfo = `╭━━━━━━━━━━━━━━━━━━╮
│  💰 ECONOMY STATUS
╰━━━━━━━━━━━━━━━━━━╯

👤 User: ${targetName}
📊 Rank: ${rank}
⭐ Level: ${level}
✨ XP: ${xp}/${nextLevelXP} (${xpProgress}%)

💵 Wallet: 🪙 ${balance.toLocaleString()}
🏦 Bank: 🪙 ${bank.toLocaleString()}
💎 Total: 🪙 ${total.toLocaleString()}

🔥 Daily Streak: ${streak} days

📈 Progress to Level ${level + 1}:
${'▓'.repeat(Math.floor(xpProgress / 10))}${'░'.repeat(10 - Math.floor(xpProgress / 10))} ${xpProgress}%`;

            await sock.sendMessage(from, {
                text: balanceInfo,
                mentions: [targetJid]
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Error fetching balance. Please try again.'
            }, { quoted: message });
        }
    }
};
