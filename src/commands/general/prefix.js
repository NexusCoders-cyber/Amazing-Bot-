import config from '../../config.js';
import Settings from '../../models/Settings.js';

const VALID_PREFIXES = /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`.]{1,5}$/;

async function savePrefix(newPrefix) {
    try {
        await Settings.findOneAndUpdate(
            { key: 'prefix' },
            { key: 'prefix', value: newPrefix },
            { upsert: true, new: true }
        );
    } catch {}
}

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
        if (args.length === 0) {
            return await sock.sendMessage(from, {
                text: `⚙️ *Bot Prefix*\n\nCurrent prefix: *${config.prefix}*\n\nUsage: ${config.prefix}prefix <new prefix>\nExample: ${config.prefix}prefix !`
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
                text: `❌ Invalid prefix.\n\nPrefix must be 1-5 special characters.\nExample: ! . # $ @`
            }, { quoted: message });
        }

        const oldPrefix = config.prefix;
        config.prefix = newPrefix;
        await savePrefix(newPrefix);

        await sock.sendMessage(from, {
            text: `✅ *Prefix Updated*\n\nOld prefix: *${oldPrefix}*\nNew prefix: *${newPrefix}*\n\nAll commands now use: *${newPrefix}help*`
        }, { quoted: message });
    }
};
