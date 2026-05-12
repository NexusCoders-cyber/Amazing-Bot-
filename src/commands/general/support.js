import config from '../../config.js';

export default {
    name: 'support',
    aliases: ['supportgroup', 'helpgroup'],
    category: 'general',
    description: 'Get the support group link',
    usage: 'support',
    cooldown: 5,
    permissions: ['user'],

    async execute({ sock, message, from }) {
        const supportGroup = config.supportGroup || 'https://chat.whatsapp.com/YOUR_GROUP_LINK';
        const waChannel = 'https://whatsapp.com/channel/0029Vb8Pn1R65yDDeccQNH3j';
        const telegramChannel = process.env.TELEGRAM_CHANNEL_LINK || 'https://t.me/primeee_official';
        const telegramGroup = process.env.TELEGRAM_GROUP_LINK || 'https://t.me/+lmD9XlIGB742MmY0';

        const supportText = `╭──⦿【 🌟 ILOM SUPPORT HUB 】
│
│ 👋 Need help or latest updates?
│ Follow and join our communities:
│
│ 📢 WhatsApp Channel
│ ${waChannel}
│
│ 💬 WhatsApp Support Group
│ ${supportGroup}
│
│ ✈️ Telegram Channel
│ ${telegramChannel}
│
│ 👥 Telegram Group
│ ${telegramGroup}
│
│ 👨‍💻 Owner: ${config.ownerName}
│ 🌐 Website: ${config.botWebsite}
│
╰────────────⦿

Follow the ASTA BOT channel on WhatsApp and stay updated daily 🚀`;

        await sock.sendMessage(from, {
            text: supportText
        }, { quoted: message });
    }
};
