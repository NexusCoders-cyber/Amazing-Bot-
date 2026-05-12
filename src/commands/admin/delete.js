import { disableWatch, formatWatchConfig, parseWatchArgs, setWatchConfig } from '../../utils/messageWatchStore.js';

const USAGE = `*Usage Examples:*
- delete g - Send deleted messages in the same chat
- delete p - Send deleted messages to your chat/sudo
- delete g pm - Same chat, only personal messages
- delete g gm - Same chat, only group messages
- delete p no-gm - To sudo, exclude groups
- delete p no-pm - To sudo, exclude personal chats
- delete <jid> - Send to a specific JID
- delete <jid> gm - To JID, only groups
- delete off - Disable anti-delete

*Scopes:* pm, gm, no-pm, no-gm`;

export default {
    name: 'delete',
    aliases: ['antidelete', 'delwatch'],
    category: 'admin',
    description: 'Configure anti-delete forwarding destination and scope',
    usage: 'delete <g|p|jid|off> [scope]',
    cooldown: 2,

    async execute({ sock, message, from, args }) {
        const parsed = parseWatchArgs(args);

        if (parsed.error === 'missing') {
            return sock.sendMessage(from, { text: `🗑️ *Anti-Delete Config*\n\n${formatWatchConfig('antidelete')}\n\n${USAGE}` }, { quoted: message });
        }

        if (parsed.error === 'invalid') {
            return sock.sendMessage(from, { text: `❌ Invalid option.\n\n${USAGE}` }, { quoted: message });
        }

        if (parsed.off) {
            disableWatch('antidelete');
            return sock.sendMessage(from, { text: '✅ Anti-delete disabled.' }, { quoted: message });
        }

        setWatchConfig('antidelete', parsed);
        return sock.sendMessage(from, {
            text: `✅ Anti-delete enabled.\n\n${formatWatchConfig('antidelete')}`
        }, { quoted: message });
    }
};
