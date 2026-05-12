import { disableWatch, formatWatchConfig, parseWatchArgs, setWatchConfig } from '../../utils/messageWatchStore.js';

const USAGE = `*Usage Examples:*
- antiedit g - Send edit history in the same chat
- antiedit p - Send edit history to your chat/sudo
- antiedit g pm - Same chat, only personal messages
- antiedit g gm - Same chat, only group messages
- antiedit p no-gm - To sudo, exclude groups
- antiedit p no-pm - To sudo, exclude personal chats
- antiedit <jid> - Send to a specific JID
- antiedit <jid> gm - To JID, only groups
- antiedit off - Disable anti-edit

*Scopes:* pm, gm, no-pm, no-gm`;

export default {
    name: 'antiedit',
    aliases: ['editwatch'],
    category: 'admin',
    description: 'Configure anti-edit forwarding destination and scope',
    usage: 'antiedit <g|p|jid|off> [scope]',
    cooldown: 2,

    async execute({ sock, message, from, args }) {
        const parsed = parseWatchArgs(args);

        if (parsed.error === 'missing') {
            return sock.sendMessage(from, { text: `✏️ *Anti-Edit Config*\n\n${formatWatchConfig('antiedit')}\n\n${USAGE}` }, { quoted: message });
        }

        if (parsed.error === 'invalid') {
            return sock.sendMessage(from, { text: `❌ Invalid option.\n\n${USAGE}` }, { quoted: message });
        }

        if (parsed.off) {
            disableWatch('antiedit');
            return sock.sendMessage(from, { text: '✅ Anti-edit disabled.' }, { quoted: message });
        }

        setWatchConfig('antiedit', parsed);
        return sock.sendMessage(from, {
            text: `✅ Anti-edit enabled.\n\n${formatWatchConfig('antiedit')}`
        }, { quoted: message });
    }
};
