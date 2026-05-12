import { isAntiOutEnabled, setAntiOut } from '../../utils/antioutStore.js';

export default {
    name: 'antiout',
    aliases: ['noout'],
    category: 'admin',
    description: 'Toggle anti-out auto re-add for voluntary leaves',
    usage: 'antiout <on|off|status>',
    cooldown: 5,
    permissions: ['admin'],
    args: false,
    groupOnly: true,

    async execute({ sock, message, from, args, isGroupAdmin, isBotAdmin, prefix }) {
        if (!isGroupAdmin) {
            return await sock.sendMessage(from, { text: '❌ Admin only command.' }, { quoted: message });
        }

        const action = (args?.[0] || '').toLowerCase();
        if (!action || action === 'status') {
            const enabled = await isAntiOutEnabled(from);
            return await sock.sendMessage(from, {
                text: `🛡️ Antiout is currently ${enabled ? '✅ ON' : '❌ OFF'}\n\nUsage:\n${prefix}antiout on\n${prefix}antiout off\n${prefix}antiout status`
            }, { quoted: message });
        }

        if (!['on', 'off'].includes(action)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid option. Use: ${prefix}antiout <on|off|status>`
            }, { quoted: message });
        }

        if (action === 'on' && !isBotAdmin) {
            return await sock.sendMessage(from, {
                text: '❌ Bot must be admin before enabling antiout.'
            }, { quoted: message });
        }

        const enabled = await setAntiOut(from, action === 'on');
        await sock.sendMessage(from, {
            text: `Antiout ${enabled ? '✅ ON' : '❌ OFF'}\n\nℹ️ Re-add is attempted only for voluntary leaves and throttled for safety.`
        }, { quoted: message });
    }
};
