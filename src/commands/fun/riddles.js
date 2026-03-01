import axios from 'axios';

export default {
    name: 'riddles',
    aliases: ['newriddle', 'riddleapi'],
    category: 'fun',
    description: 'Get a random riddle from API',
    usage: 'riddles',
    example: 'riddles',
    cooldown: 5,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 0,
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
            await sock.sendMessage(from, { react: { text: '🧩', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `🧩 *Fetching Riddle*...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/riddles?apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const riddle = response.data;

            if (!riddle || !riddle.riddle) {
                await sock.sendMessage(from, { delete: processMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nNo riddle found.\n\n💡 Try again later!`
                }, { quoted: message });
                return;
            }

            const reply = `🧩 *Riddle*\n\n${riddle.riddle}\n\n*Answer*: ||${riddle.answer}||\n\n💡 Use \`${prefix}riddles\` for another one!`;

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, { text: reply }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Riddle command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch riddle: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
