import { getUser, createUser, updateUser } from '../../models/User.js';

export default {
    name: 'shop',
    aliases: ['store', 'buy'],
    category: 'economy',
    description: 'Buy items and upgrades from the shop',
    usage: 'shop [item name]',
    example: 'shop premium',
    cooldown: 3,
    permissions: ['user'],

    async execute({ sock, message, from, sender, args }) {
        try {
            const shopItems = [
                {
                    id: 'xp_boost',
                    name: 'XP Boost',
                    emoji: '⚡',
                    price: 5000,
                    description: '+500 XP instantly',
                    effect: { type: 'xp', value: 500 }
                },
                {
                    id: 'level_up',
                    name: 'Level Up',
                    emoji: '⭐',
                    price: 10000,
                    description: 'Instant level up',
                    effect: { type: 'level', value: 1 }
                },
                {
                    id: 'money_multiplier',
                    name: 'Money Multiplier',
                    emoji: '💰',
                    price: 15000,
                    description: '+10,000 coins',
                    effect: { type: 'money', value: 10000 }
                },
                {
                    id: 'streak_saver',
                    name: 'Streak Saver',
                    emoji: '🔥',
                    price: 8000,
                    description: '+5 day streak',
                    effect: { type: 'streak', value: 5 }
                },
                {
                    id: 'premium_badge',
                    name: 'Premium Badge',
                    emoji: '👑',
                    price: 50000,
                    description: 'Get premium rank',
                    effect: { type: 'rank', value: 'Premium' }
                },
                {
                    id: 'vip_badge',
                    name: 'VIP Badge',
                    emoji: '💎',
                    price: 100000,
                    description: 'Get VIP rank',
                    effect: { type: 'rank', value: 'VIP' }
                }
            ];

            if (!args[0]) {
                let shopMessage = `╭━━━━━━━━━━━━━━━━━━╮\n`;
                shopMessage += `│  🏪 ITEM SHOP\n`;
                shopMessage += `╰━━━━━━━━━━━━━━━━━━╯\n\n`;

                shopItems.forEach(item => {
                    shopMessage += `${item.emoji} ${item.name}\n`;
                    shopMessage += `   💰 Price: 🪙 ${item.price.toLocaleString()}\n`;
                    shopMessage += `   📝 ${item.description}\n\n`;
                });

                shopMessage += `━━━━━━━━━━━━━━━━━━\n\n`;
                shopMessage += `💡 Buy: .shop <item name>\n`;
                shopMessage += `📝 Example: .shop xp_boost`;

                await sock.sendMessage(from, {
                    text: shopMessage
                }, { quoted: message });
                return;
            }

            const itemQuery = args.join('_').toLowerCase();
            const item = shopItems.find(i => 
                i.id === itemQuery || 
                i.name.toLowerCase().replace(/\s+/g, '_') === itemQuery
            );

            if (!item) {
                await sock.sendMessage(from, {
                    text: '❌ Item Not Found\n\nPlease check the shop for available items.\n\n💡 Use: .shop'
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

            if (balance < item.price) {
                await sock.sendMessage(from, {
                    text: `❌ Insufficient Balance\n\n${item.emoji} ${item.name}\n💰 Price: 🪙 ${item.price.toLocaleString()}\n💵 Your Balance: 🪙 ${balance.toLocaleString()}\n\n💡 You need 🪙 ${(item.price - balance).toLocaleString()} more!`
                }, { quoted: message });
                return;
            }

            const newBalance = balance - item.price;
            const updates = { 'economy.balance': newBalance };

            switch (item.effect.type) {
                case 'xp':
                    const newXP = (user.economy?.xp || 0) + item.effect.value;
                    const currentLevel = user.economy?.level || 1;
                    const xpForNextLevel = currentLevel * 100;
                    
                    if (newXP >= xpForNextLevel) {
                        updates['economy.level'] = currentLevel + 1;
                        updates['economy.xp'] = newXP - xpForNextLevel;
                    } else {
                        updates['economy.xp'] = newXP;
                    }
                    break;

                case 'level':
                    updates['economy.level'] = (user.economy?.level || 1) + item.effect.value;
                    break;

                case 'money':
                    updates['economy.balance'] = newBalance + item.effect.value;
                    break;

                case 'streak':
                    updates['economy.dailyStreak'] = (user.economy?.dailyStreak || 0) + item.effect.value;
                    break;

                case 'rank':
                    updates['economy.rank'] = item.effect.value;
                    break;
            }

            await updateUser(sender, updates);

            let purchaseMessage = `✅ Purchase Successful!\n\n`;
            purchaseMessage += `${item.emoji} ${item.name}\n`;
            purchaseMessage += `💰 Paid: 🪙 ${item.price.toLocaleString()}\n`;
            purchaseMessage += `💵 New Balance: 🪙 ${updates['economy.balance'].toLocaleString()}\n\n`;
            purchaseMessage += `📦 Item Effect:\n${item.description}\n\n`;
            purchaseMessage += `✨ Thank you for your purchase!`;

            await sock.sendMessage(from, {
                text: purchaseMessage
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: '❌ Shop error. Please try again.'
            }, { quoted: message });
        }
    }
};
