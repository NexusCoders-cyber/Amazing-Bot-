import axios from 'axios';

export default {
    name: 'line',
    aliases: ['pickup', 'flirt'],
    category: 'fun',
    description: 'Get a random pickup line',
    usage: 'line',
    example: 'line',
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
            await sock.sendMessage(from, { react: { text: '😘', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `😘 *Fetching Pickup Line*...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/pickuplines?apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const line = response.data?.line || 'No pickup line received.';

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, {
                text: `😘 *Pickup Line*\n\n${line}\n\n💡 Use \`${prefix}line\` for another one!`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Pickupline command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch pickup line: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
