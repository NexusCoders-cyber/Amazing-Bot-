import { LAB_TOOL_META } from '../../utils/labTools.js';

export default {
    name: 'devhelp',
    aliases: ['labhelp'],
    category: 'utility',
    description: 'Show help for lab/developer utility commands',
    usage: 'devhelp [command]',
    cooldown: 2,

    async execute({ sock, message, args, from, prefix }) {
        const key = String(args[0] || '').toLowerCase();
        if (key && LAB_TOOL_META[key]) {
            return sock.sendMessage(from, { text: `💡 ${prefix}${LAB_TOOL_META[key]}` }, { quoted: message });
        }

        const list = Object.keys(LAB_TOOL_META).sort();
        return sock.sendMessage(from, {
            text: [
                '💻 Dev Help',
                '',
                ...list.map((name) => `• ${prefix}${LAB_TOOL_META[name]}`),
                '',
                `Use ${prefix}devhelp <cmd> for one command.`
            ].join('\n')
        }, { quoted: message });
    }
};
