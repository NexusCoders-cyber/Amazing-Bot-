import axios from 'axios';

export default {
    name: 'waifu',
    aliases: ['wf', 'waifupic'],
    category: 'fun',
    description: 'Fetch and send a random waifu image',
    usage: 'waifu',
    example: 'waifu',
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
                text: `🎀 *Searching for Waifu*...`
            }, { quoted: message });

            // Fetch random waifu image from Waifu.pics API
            const response = await axios.get('https://api.waifu.pics/sfw/waifu', {
                timeout: 10000
            });

            if (!response.data || !response.data.url) {
                await sock.sendMessage(from, { delete: searchMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nFailed to fetch waifu image.\n\n💡 Try again later!`
                }, { quoted: message });
                return;
            }

            const imageUrl = response.data.url;

            // Delete search message
            await sock.sendMessage(from, { delete: searchMessage.key });

            // Send waifu image
            await sock.sendMessage(from, {
                image: { url: imageUrl },
                caption: `🎀 *Your Waifu*!\n📸 Source: Waifu.pics\n\n💡 Use \`${prefix}waifu\` for another one!`,
                contextInfo: {
                }
            }, { quoted: message });

        } catch (error) {
            console.error('Waifu command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch waifu image: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
