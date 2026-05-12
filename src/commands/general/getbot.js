export default {
    name: 'getbot',
    aliases: ['pairbot', 'telegrambot'],
    category: 'general',
    description: 'Get Telegram pairing bot details',
    usage: 'getbot',
    cooldown: 5,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        const text = [
            '╭━━━〔 🤖 *GET YOUR OWN BOT* 〕━━━╮',
            '┃ Want your own paired bot session?',
            '┃',
            '┃ 1) Open Telegram bot:',
            '┃    👉 @Ilompairbot',
            '┃',
            '┃ 2) Send /pair <your-number>',
            '┃ 3) Copy pairing code',
            '┃ 4) Link in WhatsApp > Linked devices',
            '┃',
            '┃ ✅ You can manage your bot from Telegram too.',
            '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯'
        ].join('\n');

        await sock.sendMessage(from, { text }, { quoted: message });
    }
};
