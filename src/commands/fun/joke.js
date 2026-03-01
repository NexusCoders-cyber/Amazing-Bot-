import axios from 'axios';

export default {
    name: 'joke',
    aliases: ['funny', 'laugh'],
    category: 'fun',
    description: 'Get a random joke',
    usage: 'joke',
    example: 'joke',
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
            await sock.sendMessage(from, { react: { text: '😂', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `😂 *Fetching Joke*...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/joke?apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const joke = response.data?.joke || 'No joke received.';

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, {
                text: `😂 *Joke*\n\n${joke}\n\n💡 Use \`${prefix}joke\` for another one!`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Joke command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch joke: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};