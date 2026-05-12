import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'json',
    aliases: ['prettify', 'formatjson'],
    category: 'utility',
    description: 'Prettify replied JSON file',
    usage: 'json (reply to .json file)',
    cooldown: 5,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.documentMessage) {
                return await sock.sendMessage(from, { text: '❌ Reply to a .json file.' }, { quoted: message });
            }

            const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {
                reuploadRequest: sock.updateMediaMessage
            });
            const parsed = JSON.parse(buffer.toString('utf8'));
            const pretty = JSON.stringify(parsed, null, 2);

            await sock.sendMessage(from, {
                text: `✅ *Formatted JSON*\n\n${pretty.slice(0, 3900)}`
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Not a valid JSON file.' }, { quoted: message });
        }
    }
};
