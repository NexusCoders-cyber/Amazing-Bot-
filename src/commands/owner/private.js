import { getSessionControl, updateSessionControl } from '../../utils/sessionControl.js';

export default {
    name: 'private',
    aliases: ['privatemode', 'botprivate'],
    category: 'owner',
    description: 'Enable private mode (only owner and sudo can use bot)',
    usage: 'private <on/off/status>',
    ownerOnly: true,
    args: false,

    async execute({ sock, message, args, from }) {
        const action = (args[0] || 'status').toLowerCase();
        const current = await getSessionControl(sock);

        if (action === 'status') {
            return await sock.sendMessage(from, {
                text: `🔒 Private mode is currently *${current.privateMode ? 'ON' : 'OFF'}*.`
            }, { quoted: message });
        }

        if (!['on', 'off'].includes(action)) {
            return await sock.sendMessage(from, {
                text: 'Use: private on | private off | private status'
            }, { quoted: message });
        }

        const enabled = action === 'on';
        await updateSessionControl(sock, { privateMode: enabled });

        return await sock.sendMessage(from, {
            text: enabled
                ? '✅ Private mode enabled. Bot now replies only to owners and sudo users for this session.'
                : '✅ Private mode disabled. Bot is now public for this session.'
        }, { quoted: message });
    }
};
