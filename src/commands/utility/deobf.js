import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
    name: 'deobf',
    aliases: ['deobfuscate', 'decrypt'],
    category: 'utility',
    description: 'Try to deobfuscate replied JS code',
    usage: 'deobf (reply to .js file)',
    cooldown: 8,
    permissions: ['user'],
    args: false,

    async execute({ sock, message, from }) {
        try {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted?.documentMessage) {
                return await sock.sendMessage(from, { text: '❌ Reply to a .js file.' }, { quoted: message });
            }

            const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {
                reuploadRequest: sock.updateMediaMessage
            });
            let code = buffer.toString('utf8');

            code = code.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
            code = code.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
            code = code.replace(/_0x[a-f0-9]+/g, 'var_alias');

            await sock.sendMessage(from, {
                text: `🔓 *Deobfuscated Code*\n\n${code.slice(0, 3900)}`
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, { text: '❌ Failed to process file.' }, { quoted: message });
        }
    }
};
