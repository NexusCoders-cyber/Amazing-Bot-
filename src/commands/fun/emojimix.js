import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

export default {
    name: 'emojimix',
    aliases: ['mixemoji', 'emoji'],
    category: 'fun',
    description: 'Combine two emojis to create an emojimix',
    usage: 'emojimix <emoji1> <emoji2>',
    example: 'emojimix 🥵 🐝',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 2,
    maxArgs: 2,
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
            const emoji1 = args[0].trim();
            const emoji2 = args[1].trim();
            if (!emoji1 || !emoji2) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nPlease provide two emojis.\n\n📜 *Usage*: \`${prefix}emojimix <emoji1> <emoji2>\`\n🎯 *Example*: \`${prefix}emojimix 🥵 🐝\``
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { react: { text: '😄', key: message.key } });
            const processMessage = await sock.sendMessage(from, {
                text: `😄 *Creating Emojimix*: ${emoji1} + ${emoji2}...`
            }, { quoted: message });

            const response = await axios.get(`https://kaiz-apis.gleeze.com/api/emojimix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}&apikey=a0ebe80e-bf1a-4dbf-8d36-6935b1bfa5ea`, {
                responseType: 'arraybuffer',
                timeout: 10000
            });

            const tempDir = path.join(process.cwd(), 'temp');
            const tempFilePath = path.join(tempDir, `emojimix_${Date.now()}.png`);
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            fs.writeFileSync(tempFilePath, response.data);

            await sock.sendMessage(from, { delete: processMessage.key });
            await sock.sendMessage(from, {
                image: fs.readFileSync(tempFilePath),
                caption: `✅ *Emojimix*\n📄 *Emojis*: ${emoji1} + ${emoji2}\n\n💡 Emojimix created successfully!`
            }, { quoted: message });

            try {
                fs.unlinkSync(tempFilePath);
                if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
                    fs.rmdirSync(tempDir);
                }
            } catch (cleanupError) {
                console.warn('Failed to clean up temporary file:', cleanupError.message);
            }

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });
        } catch (error) {
            console.error('Emojimix command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to create emojimix: ${error.message}\n\n💡 Try different emojis!`
            }, { quoted: message });
        }
    }
};
