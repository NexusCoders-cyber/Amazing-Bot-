import mongoose from 'mongoose';
import { getSessionControl, updateSessionControl } from '../../utils/sessionControl.js';

export default {
    name: 'setprefix',
    aliases: ['prefix'],
    category: 'owner',
    description: 'Change the bot command prefix',
    usage: 'setprefix <new_prefix>',
    example: 'setprefix !',
    cooldown: 5,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    maxArgs: 1,
    ownerOnly: true,

    async execute({ sock, message, from, args }) {
        const newPrefix = args[0];

        if (newPrefix.length > 5 || /\s/.test(newPrefix)) {
            return await sock.sendMessage(from, {
                text: 'Prefix must be 1-5 non-space characters.'
            }, { quoted: message });
        }

        const blocked = ['/', '\\', '|', '"', "'"];
        if (blocked.some(c => newPrefix.includes(c))) {
            return await sock.sendMessage(from, {
                text: `Prefix cannot contain: ${blocked.join(' ')}`
            }, { quoted: message });
        }

        const config = (await import('../../config.js')).default;
        const oldPrefix = (await getSessionControl(sock)).prefix || config.prefix;
        await updateSessionControl(sock, { prefix: newPrefix });

        try {
            const SettingsModel = mongoose.model('Settings');
            const sid = sock?.user?.id || 'default';
            await SettingsModel.findOneAndUpdate(
                { key: `prefix_${sid}` },
                { key: `prefix_${sid}`, value: newPrefix },
                { upsert: true }
            );
        } catch {}

        await sock.sendMessage(from, {
            text: `Prefix changed from "${oldPrefix}" to "${newPrefix}"\n\nCommands now use: ${newPrefix}help`
        }, { quoted: message });
    }
};
