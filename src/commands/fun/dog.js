import axios from 'axios';

export default {
    name: 'dog',
    aliases: ['dog', 'puppy'],
    category: 'fun',
    description: 'Fetch and send a random dog image',
    usage: 'randomdog',
    example: 'randomdog',
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
                text: `🐶 *Searching for Cute Dog*...`
            }, { quoted: message });

            // Fetch random dog image from DogAPI
            const response = await axios.get('https://dog.ceo/api/breeds/image/random', {
                timeout: 10000
            });

            if (!response.data || response.data.status !== 'success' || !response.data.message) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nFailed to fetch dog image.\n\n💡 Try again later!`
                }, { quoted: message });
                return;
            }

            const imageUrl = response.data.message;

            // Delete search message
            await sock.sendMessage(from, { delete: searchMessage.key });

            // Send dog image
            await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption: `🐶 *Cute Dog*!\n📸 Source: DogAPI\n\n💡 Use \`${prefix}randomdog\` for another pup!`
            }, { quoted: message });

        } catch (error) {
            console.error('Randomdog command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch dog image: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
