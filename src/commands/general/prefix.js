import config from '../../config.js';
import { getSessionControl, updateSessionControl } from '../../utils/sessionControl.js';

const VALID_PREFIXES = /^\S{1,5}$/;

export default {
    name: 'prefix',
    aliases: ['setprefix'],
    category: 'general',
    description: 'View or change the bot prefix',
    usage: 'prefix [new prefix]',
    example: 'prefix !',
    cooldown: 0,
    args: false,
    minArgs: 0,
    noPrefix: true,

    async execute({ sock, message, args, from, prefix, isOwner }) {
        const sessionControl = await getSessionControl(sock);
        const activePrefix = sessionControl.prefix || prefix || config.prefix;
        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: `⚙️ *Bot Prefix*\n\nCurrent prefix: *${activePrefix}*\n\nUsage: ${activePrefix}prefix <new prefix>\nExample: ${activePrefix}prefix !`
            }, { quoted: message });
        }

        if (!isOwner) {
            return await sock.sendMessage(from, {
                text: `❌ Only the bot owner can change the prefix.`
            }, { quoted: message });
        }

        const newPrefix = args[0].trim();

        if (!VALID_PREFIXES.test(newPrefix)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid prefix.\n\nPrefix must be 1-5 non-space characters.`
            }, { quoted: message });
        }

        const oldPrefix = activePrefix;
        await updateSessionControl(sock, { prefix: newPrefix });

        await sock.sendMessage(from, {
            text: `✅ *Prefix Updated*\n\nOld prefix: *${oldPrefix}*\nNew prefix: *${newPrefix}*\n\nThis session now uses: *${newPrefix}help*`
        }, { quoted: message });
    }
};
