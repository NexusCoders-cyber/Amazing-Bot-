import { getAntiBotConfig, setAntiBot } from '../../utils/antibotStore.js';

export default {
    name: 'antibot',
    aliases: ['abot'],
    category: 'admin',
    description: 'Warns bot-command abusers and kicks on 4th strike',
    usage: 'antibot <on|off|status>',
    cooldown: 3,
    groupOnly: true,
    adminOnly: true,
    botAdminRequired: true,

    async execute({ sock, message, args, from }) {
        const action = String(args[0] || 'status').toLowerCase();
        if (!['on', 'off', 'status'].includes(action)) {
            return sock.sendMessage(from, { text: '❌ Usage: antibot <on|off|status>' }, { quoted: message });
        }

        if (action === 'status') {
            const conf = await getAntiBotConfig(from);
            const warned = Object.keys(conf.warnings || {}).length;
            return sock.sendMessage(from, {
                text: `🤖 AntiBot is *${conf.enabled ? 'ON' : 'OFF'}*\nTracked users: ${warned}`
            }, { quoted: message });
        }

        const enabled = action === 'on';
        await setAntiBot(from, enabled);
        return sock.sendMessage(from, {
            text: `✅ AntiBot turned *${enabled ? 'ON' : 'OFF'}*.`
        }, { quoted: message });
    }
};
