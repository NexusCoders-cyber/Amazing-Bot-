import axios from 'axios';

export default {
    name: 'bible',
    aliases: ['verse', 'scripture'],
    category: 'utility',
    description: 'Get a random Bible verse',
    usage: 'bible',
    example: 'bible',
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
            await sock.sendMessage(from, { react: { text: '📖', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `📖 *Fetching Bible Verse*...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/bible?apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, { timeout: 10000 });
            const verse = response.data;

            if (!verse || !verse.text) {
                await sock.sendMessage(from, { delete: processMessage.key });
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nNo Bible verse found.\n\n💡 Try again later!`
                }, { quoted: message });
                return;
            }

            const reply = `📖 *Bible Verse*\n\n` +
                          `- *Text*: ${verse.text}\n` +
                          `- *Reference*: ${verse.reference || 'N/A'}\n`;

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, { text: reply }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Bible command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch verse: ${error.message}\n\n💡 Try again later!`
            }, { quoted: message });
        }
    }
};
