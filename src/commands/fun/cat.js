import axios from 'axios';

export default {
    name: 'cat',
    aliases: ['cat', 'kitty'],
    category: 'fun',
    description: 'Fetch and send a random cat image',
    usage: 'randomcat',
    example: 'randomcat',
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
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            // React with magnifying glass emoji (🔍)
            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            // Send temporary searching message
            const searchMessage = await sock.sendMessage(from, {
                text: `😺 *Searching for Cute Cat*...`
            }, { quoted: message });

            // Fetch random cat image from TheCatAPI
            const response = await axios.get('https://api.thecatapi.com/v1/images/search', {
                timeout: 10000
            });

            if (!response.data || !response.data[0]?.url) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nFailed to fetch cat image.\n\n💡 Try again later!`
                }, { quoted: message });
                return;
            }

            const imageUrl = response.data[0].url;

            // Delete search message
            await sock.sendMessage(from, { delete: searchMessage.key });

            // Send cat image
            await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption: `😺 *Cute Cat*!\n📸 Source: TheCatAPI\n\n💡 Use \`${prefix}randomcat\` for another kitty!`
            }, { quoted: message });

        } catch (error) {
            console.error('Randomcat command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch cat image: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
