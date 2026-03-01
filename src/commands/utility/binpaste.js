import axios from 'axios';

export default {
    name: 'binpaste',
    aliases: ['paste', 'textbin'],
    category: 'utility',
    description: 'Create temporary text pastes',
    usage: 'binpaste <text> [expiration]',
    example: 'binpaste Hey whatsup 1hr',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: Infinity,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: true,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const validExpirations = ['0', '1hr', '4hr', '12hr', '24hr', '7days', '30days'];
            let expiration = args[args.length - 1];
            let text = args.join(' ').trim();
            if (validExpirations.includes(expiration)) {
                text = args.slice(0, -1).join(' ').trim();
            } else {
                expiration = '1hr';
            }

            if (!text) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nPlease provide text to paste.\n\n📜 *Usage*: \`${prefix}binpaste <text> [expiration]\`\n🎯 *Example*: \`${prefix}binpaste Hey whatsup 1hr\`\n\n*Valid Expirations*: ${validExpirations.join(', ')}`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { react: { text: '📋', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `📋 *Creating Paste*...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/binpaste?text=${encodeURIComponent(text)}&expiration=${expiration}&apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const paste = response.data;

            if (!paste || !paste.url) {
                await sock.sendMessage(from, { delete: processMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nFailed to create paste.\n\n💡 Try again later!`
                }, { quoted: message });
                return;
            }

            const reply = `📋 *Text Paste*\n\n` +
                          `- *URL*: ${paste.url}\n` +
                          `- *Expiration*: ${expiration}\n` +
                          `- *Content*: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}\n`;

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, { text: reply }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Binpaste command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to create paste: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
