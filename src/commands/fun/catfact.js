import axios from 'axios';

export default {
    name: 'catfact',
    aliases: ['cat', 'meow'],
    category: 'fun',
    description: 'Get a random cat fact',
    usage: 'catfact',
    example: 'catfact',
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
            await sock.sendMessage(from, { react: { text: '😺', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `😺 *Fetching Cat Fact*...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/catfact?apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const fact = response.data?.fact || 'No fact received.';

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, {
                text: `😺 *Cat Fact*\n\n${fact}\n\n💡 Use \`${prefix}catfact\` for another fact!`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Catfact command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch cat fact: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
