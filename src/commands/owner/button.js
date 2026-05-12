import { isTopOwner } from '../../utils/privilegedUsers.js';
import { getButtonMode, setButtonMode } from '../../utils/buttonMode.js';

export default {
    name: 'button',
    aliases: ['buttonmode', 'btnmode'],
    category: 'owner',
    description: 'Manage global interactive button reply mode',
    usage: 'button <on|off|toggle|status|help>',
    cooldown: 2,
    ownerOnly: true,
    minArgs: 0,

    async execute({ sock, message, from, sender, args, prefix }) {
        if (!isTopOwner(sender)) {
            return sock.sendMessage(from, { text: '❌ Only the bot owner can use this command.' }, { quoted: message });
        }

        const action = String(args[0] || 'status').toLowerCase();
        if (!['on', 'off', 'toggle', 'status', 'help'].includes(action)) {
            return sock.sendMessage(from, {
                text: `❌ Usage: ${prefix}button <on|off|toggle|status|help>`
            }, { quoted: message });
        }

        if (action === 'help') {
            return sock.sendMessage(from, {
                text: [
                    '🔘 *Button Mode Guide*',
                    '',
                    `• ${prefix}button on   → enable button/list replies`,
                    `• ${prefix}button off  → disable interactive replies`,
                    `• ${prefix}button toggle → switch current state`,
                    `• ${prefix}button status → view current state`,
                    '',
                    'When ON, commands that support buttons/lists send tappable options instead of plain text.'
                ].join('\n')
            }, { quoted: message });
        }

        if (action === 'status') {
            const enabled = await getButtonMode();
            return sock.sendMessage(from, {
                text: `🎛️ Button mode is currently *${enabled ? 'ON' : 'OFF'}*.`
            }, { quoted: message });
        }

        const current = await getButtonMode();
        const next = action === 'toggle' ? !current : action === 'on';
        const enabled = await setButtonMode(next);
        return sock.sendMessage(from, {
            text: `✅ Button mode turned *${enabled ? 'ON' : 'OFF'}* successfully.`
        }, { quoted: message });
    }
};
